class_name SiegeGame
extends "res://scripts/game.gd"
## Iron & Ember rules. The old tactical model supplies only camp/economy helpers.
const SAVE_VERSION = 2
const FRONTS = ["High wall", "Causeway", "Lower gate"]
const SIEGES = [
 {"name":"The Lantern Gate", "kind":"DEFENSE", "desc":"Hold all three fronts for 4 turns.", "rounds":4, "gold":85},
 {"name":"Break the Ashen Line", "kind":"ASSAULT", "desc":"Destroy the enemy company.", "rounds":0, "gold":100},
 {"name":"The Bell Tower", "kind":"DEFENSE", "desc":"Hold 5 turns. Waves arrive on turns 2 and 4.", "rounds":5, "gold":120},
 {"name":"The Frostbound Standard", "kind":"ASSAULT", "desc":"Defeat the frost marshal and his guard.", "rounds":0, "gold":135},
 {"name":"Embers of Winterwatch", "kind":"DEFENSE", "desc":"Survive 6 turns against the winter host.", "rounds":6, "gold":155},
 {"name":"The Hollow Crown", "kind":"ASSAULT", "desc":"Slay the Hollow King and end the siege.", "rounds":0, "gold":200}
]
const REWARDS = {
 2:["Merrin joins the recruitment roster", "Storm staff command", "Forge rank I & a permanent talent"],
 3:["Ballista kit at the quartermaster", "Field medicine", "Forge rank II"],
 4:["Frostfang relic — added to your chest stores", "Fen learns Pin down"],
 5:["Rowan learns Rally", "Masterwork forge rank III"],
 6:["Talon joins the companion roster", "Gust command", "The Hollow Crown"]
}
const COMMANDS = {
 "strike":{"name":"Strike", "cost":1,"gear":"", "desc":"Strike one enemy on your front.", "target":"enemy"},
 "cleave":{"name":"Ember cleave", "cost":2,"gear":"blade", "desc":"Hit every enemy on Rowan's front.", "target":"enemy"},
 "volley":{"name":"Piercing volley", "cost":2,"gear":"bow", "desc":"Strike an enemy on any front.", "target":"enemy"},
 "ward":{"name":"Shield wall", "cost":1,"gear":"ward", "desc":"Give an ally 8 block until this turn ends.", "target":"ally"},
 "spark":{"name":"Storm bolt", "cost":2,"gear":"staff", "desc":"Strike and stun an enemy on any front.", "target":"enemy"},
 "mend":{"name":"Field medicine", "cost":2,"gear":"flask", "desc":"Restore an ally's health.", "target":"ally"},
 "pin":{"name":"Pin down", "cost":1,"gear":"", "desc":"Fen strikes and stuns a foe on his front.", "target":"enemy"},
 "frost":{"name":"Frostfang", "cost":2,"gear":"frost", "desc":"Strike and stun an enemy on any front.", "target":"enemy"},
 "rally":{"name":"Rally", "cost":1,"gear":"", "desc":"Give every living ally 4 block.", "target":"self"},
 "gust":{"name":"Gust", "cost":1,"gear":"", "desc":"Talon stuns an enemy on any front.", "target":"enemy"},
 "bolt":{"name":"Siege bolt", "cost":2,"gear":"ballista", "desc":"Strike an enemy on any front.", "target":"enemy"},
 "guard":{"name":"Brace", "cost":1,"gear":"", "desc":"Gain 6 block until this turn ends.", "target":"self"}
}

func _init():
 super()
 message="The Lantern Gate is under siege. Pack your gear, then lead the company."

func new_campaign():
 super()
 message="The Lantern Gate is under siege. Pack your gear, then lead the company."

func hero(id: String, title: String, lane: int, hp: int, power: int) -> Dictionary:
 return {"id":id,"name":title,"lane":lane,"hp":hp,"max_hp":hp,"power":power,"shield":0,"used":[],"shifted":false}

func begin(index: int) -> bool:
 if not battle.is_empty(): return fail("Finish or retreat from the active siege first.")
 if index<0 or index>=SIEGES.size() or index>campaign.unlocked or level()<index+1: return fail("Win the preceding battle to open this front.")
 var boost=(level()-1)*2+(4 if campaign.talent=="resolve" else 0)
 var power=1 if campaign.talent=="might" else 0
 var heroes=[hero("rowan","Rowan",0,26+boost,6+power),hero("lysa","Lysa",1,20+boost,5+power),hero("fen","Fen" if campaign.pet=="wolf" else "Talon",2,22+boost,5+power)]
 if campaign.mage: heroes.append(hero("merrin","Merrin",1,20+boost,6+power))
 if campaign.placements.has("ballista"): heroes.append(hero("ballista","Ballista",2,18,9))
 battle={"mission":index,"round":1,"gate":30,"phase":"playing","commands":6,"heroes":heroes,"enemies":[],"serial":0,"log":[],"rewarded":false,"reward":0,"new_level":0}
 for lane in range(3): spawn(lane, false)
 if index==0:
  spawn(0,false)
  spawn(2,false)
 if SIEGES[index].kind=="ASSAULT":
  for lane in range(3): spawn(lane,index>=3 and lane==1)
 plan()
 message="Select a hero, choose a card, then its target. Resolve the turn when your orders are set."
 return true

func spawn(lane: int,boss: bool):
 var holding=0
 for e in battle.enemies:
  if e.hp>0 and e.lane==lane: holding+=1
 if holding>=3: return
 var index=int(battle.mission)
 var hp=10+index*2+mini(int(campaign.wins[index]),3)
 if boss: hp+=22
 battle.serial+=1
 battle.enemies.append({"id":"enemy_%d" % battle.serial,"name":("Hollow King" if index==5 else "Frost marshal") if boss else ["Bone guard","Ash raider","Pike bearer"][lane],"lane":lane,"hp":hp,"max_hp":hp,"power":3+int(index/2)+(2 if boss else 0),"boss":boss,"stunned":false,"target":"gate"})

func encounter() -> Dictionary:
 return SIEGES[battle.mission]

func hurt_foe(enemy: Dictionary,amount: int):
 enemy.hp=maxi(0,int(enemy.hp)-amount)

func attack_power(enemy: Dictionary) -> int:
 return int(enemy.power)

func ally(id: String) -> Dictionary:
 for h in battle.get("heroes",[]):
  if h.id==id: return h
 return {}

func foe(id: String) -> Dictionary:
 for e in battle.get("enemies",[]):
  if e.id==id: return e
 return {}

func cards(id: String) -> Array:
 var result=["strike","guard"]
 if id=="rowan":
  if campaign.placements.has("blade"): result.insert(0,"cleave")
  if campaign.placements.has("ward"): result.insert(1,"ward")
  if level()>=5: result.insert(0,"rally")
 if id=="lysa":
  if campaign.placements.has("bow"): result.insert(0,"volley")
  if campaign.placements.has("frost"): result.insert(0,"frost")
 if id=="merrin":
  if campaign.placements.has("staff"): result.insert(0,"spark")
  if campaign.placements.has("flask"): result.insert(1,"mend")
 if id=="fen" and level()>=4: result.insert(0,"pin" if campaign.pet=="wolf" else "gust")
 if id=="ballista": return ["bolt","guard"]
 return result

func damage_for(actor: String,card: String) -> int:
 var h=ally(actor)
 if h.is_empty() or not COMMANDS.has(card): return 0
 var gear=COMMANDS[card].gear
 var bonus=int(campaign.items.get(gear,0))*2+(2 if empowered(gear) else 0)
 return int(h.power)+bonus+({"cleave":2,"volley":4,"spark":2,"frost":2,"bolt":3,"mend":3}.get(card,0))

func damage_against(actor: String,card: String,_enemy: Dictionary) -> int:
 return damage_for(actor,card)

func after_command(_actor: String,_card: String,_target: String):
 pass

func card_text(actor: String,card: String) -> String:
 var d=COMMANDS[card]
 var text=d.desc
 if card in ["strike","cleave","volley","spark","pin","frost","bolt"]: text+="\n%d damage" % damage_for(actor,card)
 if card=="mend": text+="\n%d healing" % damage_for(actor,card)
 if d.gear!="" and empowered(d.gear): text+=" · Rune-linked +2"
 return text

func reason(actor: String,card: String,target: String="") -> String:
 if battle.is_empty() or battle.phase!="playing": return "No active battle."
 var h=ally(actor)
 if h.is_empty() or h.hp<=0: return "Choose a living hero."
 if card not in cards(actor): return "Pack the required gear at the keep."
 if card in h.used: return "Already used this turn."
 if battle.commands<COMMANDS[card].cost: return "Not enough orders. Choose a cheaper command or end the turn."
 if target=="": return ""
 if COMMANDS[card].target=="self": return ""
 var t=ally(target) if COMMANDS[card].target=="ally" else foe(target)
 if t.is_empty() or t.hp<=0: return "Choose a living "+COMMANDS[card].target+"."
 if card in ["strike","cleave","pin"] and t.lane!=h.lane: return "Target must be on this hero's front. Reposition first."
 return ""

func play(actor: String,card: String,target: String) -> bool:
 var error=reason(actor,card,target)
 if error!="": return fail(error)
 if target=="" and COMMANDS[card].target!="self": return fail("Choose a target.")
 var h=ally(actor)
 var d=COMMANDS[card]
 var power=damage_for(actor,card)
 battle.commands-=d.cost
 h.used.append(card)
 match card:
  "guard": h.shield+=6
  "ward": ally(target).shield+=8+int(campaign.items.get("ward",0))*2
  "rally":
   for member in battle.heroes:
    if member.hp>0: member.shield+=4
  "mend":
   var t=ally(target)
   t.hp=mini(t.max_hp,int(t.hp)+power)
  "cleave":
   for e in battle.enemies:
    if e.hp>0 and e.lane==h.lane: hurt_foe(e,damage_against(actor,card,e))
  _:
   var e=foe(target)
   if card!="gust": hurt_foe(e,damage_against(actor,card,e))
   if card in ["spark","pin","frost","gust"]: e.stunned=true
 after_command(actor,card,target)
 log_event(h.name+" · "+d.name)
 plan()
 outcome()
 message=h.name+" used "+d.name+"."
 return true

func reposition(actor: String,lane: int) -> bool:
 if battle.is_empty() or battle.phase!="playing": return fail("No active battle.")
 var h=ally(actor)
 if h.is_empty() or h.hp<=0 or actor=="ballista": return fail("Choose a living hero. The ballista cannot move.")
 if lane<0 or lane>2 or lane==h.lane: return fail("Choose another front.")
 if h.shifted or battle.commands<1: return fail("Reposition once per hero each turn for 1 command.")
 var count=0
 for member in battle.heroes:
  if member.hp>0 and member.lane==lane: count+=1
 if count>=2: return fail("That front is full. Each front holds two company members.")
 h.lane=lane
 h.shifted=true
 battle.commands-=1
 plan()
 message=h.name+" moves to the "+FRONTS[lane].to_lower()+"."
 log_event(message)
 return true

func plan():
 for e in battle.get("enemies",[]):
  e.target="gate"
  for h in battle.heroes:
   if h.hp>0 and h.lane==e.lane:
    e.target=h.id
    break

func threat(e: Dictionary) -> String:
 if e.stunned: return "STUNNED · skips attack"
 var target=ally(e.target)
 return "%d → %s" % [attack_power(e),"Gate" if target.is_empty() else target.name]

func resolve() -> bool:
 if battle.is_empty() or battle.phase!="playing": return false
 before_enemy_turn()
 if battle.phase!="playing": return true
 for e in battle.enemies:
  if e.hp<=0: continue
  if e.stunned:
   e.stunned=false
   continue
  # Intent is fixed for this resolution. A fallen target's allies are not hit instead.
  if e.target=="gate":
   battle.gate=maxi(0,int(battle.gate)-attack_power(e))
   log_event(e.name+" hits the gate for %d." % attack_power(e))
  else:
   var h=ally(e.target)
   if h.hp<=0: continue
   var blocked=mini(int(h.shield),attack_power(e))
   h.shield-=blocked
   h.hp=maxi(0,int(h.hp)-attack_power(e)+blocked)
   log_event("%s takes %d damage." % [h.name,attack_power(e)-blocked])
 outcome()
 if battle.phase!="playing": return true
 after_enemy_turn()
 if battle.phase!="playing": return true
 var mission=encounter()
 if mission.kind=="DEFENSE" and battle.round>=mission.rounds:
  settle(true)
  return true
 battle.round+=1
 battle.commands=6+(1 if level()>=5 else 0)
 for h in battle.heroes:
  h.used=[]
  h.shield=0
  h.shifted=false
 if mission.kind=="DEFENSE" and int(battle.round) in [2,4,6]:
  for lane in range(3): spawn(lane,false)
 plan()
 message="Turn %d. Enemy intentions revealed; orders restored." % battle.round
 return true

func before_enemy_turn():
 pass

func after_enemy_turn():
 pass

func outcome():
 var alive=0
 var enemies=0
 for h in battle.heroes:
  if h.hp>0 and h.id!="ballista": alive+=1
 for e in battle.enemies:
  if e.hp>0: enemies+=1
 if alive==0 or battle.gate<=0: settle(false)
 elif enemies==0 and encounter().kind=="ASSAULT": settle(true)

func settle(won: bool):
 if battle.rewarded: return
 battle.phase="victory" if won else "defeat"
 battle.rewarded=true
 if won:
  var before=level()
  var index=int(battle.mission)
  var first=int(campaign.wins[index])==0
  battle.reward=SIEGES[index].gold if first else int(SIEGES[index].gold/2)
  campaign.gold+=battle.reward
  campaign.xp=mini(350,int(campaign.xp)+(70 if first else 35))
  campaign.wins[index]+=1
  campaign.unlocked=mini(5,maxi(int(campaign.unlocked),index+1))
  battle.new_level=level() if level()>before else 0
  if before<4 and level()>=4: campaign.items.frost=0
  log_event("Victory · +%d gold" % battle.reward)
 else: log_event("Withdrawn. Your company and equipment are safe.")

func retreat():
 if not battle.is_empty() and battle.phase=="playing": settle(false)

func snapshot() -> Dictionary:
 return {"version":SAVE_VERSION,"campaign":campaign.duplicate(true),"battle":battle.duplicate(true)}

func validate_save(data) -> String:
 if not data is Dictionary or not integer_in(data.get("version"),SAVE_VERSION,SAVE_VERSION): return "Unrecognized Iron & Ember save."
 var camp=super.validate_save({"version":1,"campaign":data.get("campaign"),"battle":{}})
 if camp!="": return camp
 var b=data.get("battle")
 if not b is Dictionary: return "Missing siege state."
 if b.is_empty(): return ""
 for pair in [["mission",0,5],["round",1,100000],["gate",0,30],["commands",0,7],["serial",1,100000],["reward",0,1000],["new_level",0,6]]:
  if not integer_in(b.get(pair[0]),pair[1],pair[2]): return "Invalid siege "+pair[0]
 if b.get("phase") not in ["playing","victory","defeat"] or not b.get("rewarded") is bool or b.rewarded!=(b.phase!="playing"): return "Invalid siege phase."
 if not b.get("heroes") is Array or b.heroes.size()<3 or b.heroes.size()>5 or not b.get("enemies") is Array or b.enemies.size()>100: return "Invalid siege company."
 if not b.get("log") is Array or b.log.size()>30: return "Invalid siege log."
 for entry in b.log:
  if not entry is String: return "Invalid siege log entry."
 var ids=[]
 for h in b.heroes:
  if not h is Dictionary or h.get("id") not in ["rowan","lysa","fen","merrin","ballista"] or h.id in ids or not h.get("name") is String: return "Invalid hero."
  ids.append(h.id)
  for key in ["hp","max_hp","power","shield","lane"]:
   if not integer_in(h.get(key),0,2 if key=="lane" else 10000): return "Invalid hero stats."
  if h.max_hp<1 or h.hp>h.max_hp or not h.get("shifted") is bool or not h.get("used") is Array: return "Invalid hero state."
  for c in h.used:
   if not COMMANDS.has(c): return "Invalid used command."
 for id in ["rowan","lysa","fen"]:
  if id not in ids: return "Missing founding hero."
 var enemy_ids=[]
 for e in b.enemies:
  if not e is Dictionary or not e.get("id") is String or e.id in enemy_ids or not e.get("name") is String: return "Invalid enemy."
  enemy_ids.append(e.id)
  for key in ["hp","max_hp","power","lane"]:
   if not integer_in(e.get(key),0,2 if key=="lane" else 10000): return "Invalid enemy stats."
  if e.max_hp<1 or e.hp>e.max_hp or not e.get("stunned") is bool or not e.get("boss") is bool: return "Invalid enemy state."
  if not e.get("target") is String or (e.target!="gate" and e.target not in ids): return "Invalid enemy target."
 return ""
