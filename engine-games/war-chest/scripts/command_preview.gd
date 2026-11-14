extends RefCounted
## Exact, disposable rule execution. Never changes the live model or storage.
const Model=preload("res://scripts/story_game.gd")
const ATTACKS=["strike","cleave","volley","spark","pin","frost","bolt","gust"]

static func incoming(game,id: String) -> int:
 var total=0
 for enemy in game.battle.get("enemies",[]):
  if enemy.hp>0 and not enemy.stunned and enemy.target==id:
   total+=game.attack_power(enemy)
 return total

static func predict(game,actor: String,card: String,target: String) -> Dictionary:
 var error=game.reason(actor,card,target)
 if error!="":return {"error":error}
 if target=="" and Model.COMMANDS[card].target!="self":return {"error":"Choose a target."}
 var copy=Model.new()
 if not copy.restore(game.snapshot()):return {"error":"Preview unavailable. Your company is unchanged."}
 var before=copy.battle.duplicate(true)
 if not copy.play(actor,card,target):return {"error":copy.message}
 var changes=[]
 var defeated=0
 for unit in before.heroes+before.enemies:
  var after=copy.ally(unit.id) if not copy.ally(unit.id).is_empty() else copy.foe(unit.id)
  if after.is_empty():continue
  var damage=int(unit.hp)-int(after.hp)
  var block=int(after.get("shield",0))-int(unit.get("shield",0))
  var stunned=after.get("stunned",false) and not unit.get("stunned",false)
  if damage!=0 or block>0 or stunned:
   changes.append({"id":unit.id,"name":unit.name,"hp":after.hp,"damage":damage,"block":block,"stunned":stunned})
   if unit.hp>0 and after.hp<=0:defeated+=1
 var next_hp={}
 var after_order=copy.battle.duplicate(true)
 if copy.battle.phase=="playing":
  copy.resolve()
  for hero in after_order.heroes:
   next_hp[hero.id]=copy.ally(hero.id).hp
 return {"error":"","changes":changes,"defeated":defeated,"orders":Model.COMMANDS[card].cost,"remaining":before.commands-Model.COMMANDS[card].cost,"next_hp":next_hp}

static func description(game,actor: String,card: String,target: String) -> String:
 var result=predict(game,actor,card,target)
 if result.error!="":return result.error
 var parts=PackedStringArray()
 if card=="cleave" and not result.changes.is_empty():
  var damage=result.changes[0].damage
  var equal=result.changes.all(func(change):return change.damage==damage)
  if equal:
   parts.append("%d damage to every foe on this front" % damage)
   if result.defeated==result.changes.size():
    return " · ".join(parts)+" · %d defeated · %d orders" % [result.defeated,result.orders]
   var remaining=PackedStringArray()
   for change in result.changes:remaining.append("%d" % change.hp)
   return " · ".join(parts)+" · HP left: "+", ".join(remaining)+" · %d orders" % result.orders
 for change in result.changes:
  if change.hp<=0:parts.append(change.name+" defeated")
  elif change.damage>0 and card!="cleave":parts.append("%s: %d damage, %d HP left" % [change.name,change.damage,change.hp])
  elif change.damage>0:parts.append("%s: %d HP left" % [change.name,change.hp])
  elif change.damage<0:parts.append("%s: +%d HP" % [change.name,-change.damage])
  if change.block>0:
   parts.append("%s: +%d block" % [change.name,change.block])
   if result.next_hp.has(change.id):
    var loss=maxi(0,int(game.ally(change.id).hp)-int(result.next_hp[change.id]))
    parts.append("%d HP lost if enemies act now" % loss)
  if change.stunned and change.hp>0:parts.append("Stunned: cancels its next attack")
 return " · ".join(parts)+" · %d order%s" % [result.orders,"" if result.orders==1 else "s"]
