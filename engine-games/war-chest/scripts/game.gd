class_name WarGame
extends RefCounted
## Deterministic, presentation-free rules. Coordinates and saves use JSON primitives.

const WIDTH = 8
const HEIGHT = 8
const CHEST_W = 6
const CHEST_H = 5
const VERSION = 1
const MAX_LEVEL = 6
const XP_PER_LEVEL = 70
const UNLOCKS = {
 1:["Spatial war chest", "Rowan, Lysa & Fen", "The Old Crossing"],
 2:["Merrin & storm magic", "First permanent talent", "Lantern Gate defense", "Tempered equipment (+1)"],
 3:["Deployable ballista", "Field medicine", "Ash Marshal encounter", "Veteran equipment (+2)"],
 4:["Fen's Pin down skill", "Free Frostfang relic", "The Mossbound Road"],
 5:["Rowan's Rally skill", "Winterwatch siege", "Masterwork equipment (+3)"],
 6:["Talon the owl companion", "The Hollow Crown finale", "Veteran contract replays"]
}
const ITEMS = {
 "blade": {"name":"Emberblade", "owner":"rowan", "shape":[[0,0],[0,1],[0,2],[1,2]], "price":0, "color":"d99a6b", "ability":"cleave", "desc":"Cleave · 2 AP · strike every adjacent foe."},
 "bow": {"name":"Ashwood bow", "owner":"lysa", "shape":[[0,0],[0,1],[0,2]], "price":0, "color":"91b69a", "ability":"pierce", "desc":"True shot · 2 AP · 5-tile range."},
 "staff": {"name":"Storm staff", "owner":"merrin", "shape":[[0,0],[1,0],[0,1],[0,2]], "price":55, "color":"90b7c9", "ability":"spark", "desc":"Storm bolt · 2 AP · 4-tile range."},
 "ward": {"name":"Oaken shield", "owner":"rowan", "shape":[[0,0],[1,0],[0,1],[1,1]], "price":0, "color":"c6b17f", "ability":"ward", "desc":"Bulwark · 1 AP · shield an ally within 2 tiles."},
 "cube": {"name":"Storm rune", "owner":"any", "shape":[[0,0]], "price":45, "color":"7fbec5", "ability":"", "desc":"Adjacent weapons gain +2 damage and chain for 2."},
 "flask": {"name":"Field medicine", "owner":"merrin", "shape":[[0,0],[0,1]], "price":35, "color":"c59eae", "ability":"mend", "desc":"Mend · 2 AP · restore 7 health within 3 tiles."},
 "ballista": {"name":"Ballista kit", "owner":"rowan", "shape":[[0,0],[1,0],[2,0],[1,1]], "price":85, "color":"bba17a", "ability":"", "desc":"Deploys a controllable ballista in defense missions."},
 "frost": {"name":"Frostfang relic", "owner":"lysa", "shape":[[0,0],[1,0],[1,1]], "price":0, "color":"a4cdd8", "ability":"frost", "desc":"Icebind · 2 AP · 4 range · damage and cancel enemy intent."},
 "pennant": {"name":"Scout's pennant", "owner":"any", "shape":[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]], "price":0, "color":"367dde", "ability":"", "desc":"First company move each turn costs no orders."},
 "aegis": {"name":"Dawn aegis", "owner":"any", "shape":[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], "price":0, "color":"ffc750", "ability":"", "desc":"Guard grants its user 4 extra block."},
 "lens": {"name":"Watcher's lens", "owner":"any", "shape":[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], "price":0, "color":"87bda9", "ability":"", "desc":"Ranged damage +3 when the shooter's front has no living foes."}
}
const MISSIONS = [
 {"name":"The Old Crossing", "kind":"SKIRMISH", "subtitle":"Take back the bridge. Leave no raiders standing.", "reward":85, "xp":70},
 {"name":"Hold the Lantern Gate", "kind":"DEFENSE", "subtitle":"Keep the gate standing for five rounds. Reinforcements arrive in rounds 2 and 4.", "reward":100, "xp":70},
 {"name":"The Ashen Standard", "kind":"COMMANDER", "subtitle":"Defeat the Ash Marshal and his remaining guard.", "reward":120, "xp":70},
 {"name":"The Mossbound Road", "kind":"AMBUSH", "subtitle":"Break an archer ambush on the overgrown causeway.", "reward":130, "xp":70},
 {"name":"Winterwatch", "kind":"DEFENSE", "subtitle":"Hold the snowbound gate for five rounds against the frost host.", "reward":145, "xp":70},
 {"name":"The Hollow Crown", "kind":"FINALE", "subtitle":"Defeat the Hollow King and end the march of the dead.", "reward":180, "xp":70}
]
var campaign: Dictionary = {}
var battle: Dictionary = {}
var message = ""
var save_error = ""
var save_locked = false

func _init():
 new_campaign()

func new_campaign():
 campaign = {"gold":60,"xp":0,"unlocked":0,"wins":[0,0,0,0,0,0],"mage":false,"talent":"","pet":"wolf", "items":{"blade":0,"bow":0,"ward":0,"cube":0},"placements":{"blade":[0,0,0],"bow":[2,0,0],"ward":[3,0,0],"cube":[1,1,0]}}
 battle = {}
 message = "The company is yours. Win the Old Crossing to unlock Merrin, storm magic and your first talent."

func level() -> int:
 return mini(MAX_LEVEL,1 + int(campaign.xp / XP_PER_LEVEL))

func item_level(id: String) -> int:
 return {"staff":2,"flask":3,"ballista":3,"frost":4}.get(id,1)

func forge_limit() -> int:
 return 3 if level()>=5 else (2 if level()>=3 else (1 if level()>=2 else 0))

func is_defense() -> bool:
 return not battle.is_empty() and int(battle.mission) in [1,4]

func choose_pet(id: String) -> bool:
 if not battle.is_empty() or id not in ["wolf","owl"] or (id=="owl" and level()<6): return fail("Talon joins at level 6. Change companions at camp.")
 campaign.pet=id
 message="Fen is ready to march." if id=="wolf" else "Talon takes to the sky. Gust disrupts distant enemies."
 return true

func shape(id: String, rotation: int) -> Array:
 var result = []
 for p in ITEMS[id].shape:
  var x = int(p[0])
  var y = int(p[1])
  for i in range(posmod(rotation,4)):
   var old_x = x
   x = -y
   y = old_x
  result.append([x,y])
 var min_x = 99
 var min_y = 99
 for p in result:
  min_x = mini(min_x,p[0])
  min_y = mini(min_y,p[1])
 for p in result:
  p[0] -= min_x
  p[1] -= min_y
 return result

func cells(id: String, placement: Array) -> Array:
 var out = []
 for p in shape(id,int(placement[2])):
  out.append([p[0]+int(placement[0]),p[1]+int(placement[1])])
 return out

func can_place(id: String, x: int, y: int, rotation: int, placements = null) -> bool:
 if not ITEMS.has(id): return false
 var layout = campaign.placements if placements == null else placements
 var occupied = []
 for other in layout:
  if other != id: occupied.append_array(cells(other,layout[other]))
 for p in cells(id,[x,y,rotation]):
  if p[0]<0 or p[1]<0 or p[0]>=CHEST_W or p[1]>=CHEST_H or p in occupied: return false
 return true

func place(id: String, x: int, y: int, rotation: int) -> bool:
 if not battle.is_empty() or not campaign.items.has(id): return fail("Equipment is changed at camp.")
 if not can_place(id,x,y,rotation): return fail("That shape overlaps gear or extends beyond the chest. Rotate it or choose another cell.")
 campaign.placements[id] = [x,y,posmod(rotation,4)]
 message = "%s packed." % ITEMS[id].name
 return true

func stow(id: String):
 if not battle.is_empty(): return
 campaign.placements.erase(id)
 message = "Stored at camp. Select the item, then a chest cell to pack it again."

func empowered(id: String) -> bool:
 if id == "cube" or not campaign.placements.has("cube") or not campaign.placements.has(id): return false
 for a in cells(id,campaign.placements[id]):
  for b in cells("cube",campaign.placements.cube):
   if distance(a,b)==1: return true
 return false

func buy(id: String) -> bool:
 if not battle.is_empty(): return fail("Return to camp before shopping.")
 if not ITEMS.has(id) or campaign.items.has(id): return fail("That equipment is already owned.")
 if id in ["pennant","aegis","lens"]: return fail("Earn this relic from its side quest.")
 if level()<item_level(id): return fail("This equipment unlocks at company level %d." % item_level(id))
 var cost = ITEMS[id].price
 if campaign.gold < cost: return fail("Not enough gold. Complete a mission to earn more.")
 campaign.gold -= cost
 campaign.items[id] = 0
 message = "%s acquired. Pack it in the war chest to use it." % ITEMS[id].name
 return true

func upgrade(id: String) -> bool:
 if not battle.is_empty() or not campaign.items.has(id): return fail("Only owned equipment can be forged at camp.")
 if id in ["cube","ballista","pennant","aegis","lens"]: return fail("This equipment has no forge upgrades.")
 var rank = int(campaign.items[id])
 if rank>=forge_limit(): return fail("The next forge rank is still locked. Check the level rewards.")
 if rank >= 3: return fail("This item is masterwork already.")
 var cost = 30 + rank*25
 if campaign.gold < cost: return fail("Not enough gold for this upgrade.")
 campaign.gold -= cost
 campaign.items[id] = rank+1
 message = "%s forged to +%d." % [ITEMS[id].name,rank+1]
 return true

func recruit() -> bool:
 if level()<2: return fail("Merrin joins after your first level-up. Win the Old Crossing.")
 if not battle.is_empty() or campaign.mage: return fail("Merrin is already with the company, or you are away from camp.")
 if campaign.gold<60: return fail("Merrin's contract costs 60 gold.")
 campaign.gold -= 60
 campaign.mage = true
 if not campaign.items.has("staff"): campaign.items.staff = 0
 message = "Merrin joins, bringing a storm staff. Pack it to unlock Storm bolt."
 return true

func choose_talent(id: String) -> bool:
 if not battle.is_empty() or level()<2 or campaign.talent!="" or id not in ["might","resolve"]: return fail("Choose one permanent talent at level 2, while at camp.")
 campaign.talent = id
 message = "Talent learned: " + ("Battlecraft (+1 party damage)." if id=="might" else "Iron resolve (+4 party health).")
 return true

func unit(id: String, title: String, team: String, pos: Array, hp: int, power: int, reach: int, role: String) -> Dictionary:
 return {"id":id,"name":title,"team":team,"pos":pos,"hp":hp,"max_hp":hp,"power":power,"range":reach,"ap":2,"shield":0,"role":role,"used":[],"intent":{}}

func start_mission(index: int) -> bool:
 if not battle.is_empty(): return fail("Finish the current expedition first.")
 if index<0 or index>=MISSIONS.size() or index>campaign.unlocked or level()<index+1: return fail("Win the preceding mission and reach level %d to unlock this route." % (index+1))
 var boost = (level()-1)*2 + (4 if campaign.talent=="resolve" else 0)
 var power = 1 if campaign.talent=="might" else 0
 var pet=campaign.get("pet","wolf")
 var heroes = [unit("rowan","Rowan","ally",[1,5],22+boost,5+power,1,"captain"),unit("lysa","Lysa","ally",[2,6],16+boost,4+power,4,"ranger"),unit("fen","Fen" if pet=="wolf" else "Talon","ally",[1,6],15+boost,4+power,1 if pet=="wolf" else 3,pet)]
 if campaign.mage: heroes.append(unit("merrin","Merrin","ally",[0,5],15+boost,4+power,3,"mage"))
 if index in [1,4] and campaign.placements.has("ballista"):
  heroes.append(unit("ballista","Ballista","ally",[3,7],16,7,6,"ballista"))
 battle = {"mission":index,"round":1,"gate":24,"phase":"playing","units":heroes,"log":[],"blocked":[[0,2],[1,2],[6,5],[7,5],[0,3],[1,3],[6,3],[7,3],[0,4],[1,4],[6,4],[7,4]],"rewarded":false}
 var scaling = mini(int(campaign.wins[index]),4)+maxi(0,index-2)*2
 add_enemy("e0","Bone guard",[3,2],10+scaling*2,3,1,"skeleton")
 add_enemy("e1","Grave archer",[5,1],8+scaling*2,3,4,"archer")
 add_enemy("e2","Bone guard",[5,3],10+scaling*2,3,1,"skeleton")
 if index in [2,5]:
  add_enemy("boss","Ash Marshal" if index==2 else "Hollow King",[4,0],32+scaling*3,6+int(scaling/2),1,"boss")
 else:
  add_enemy("e3","Pike bearer",[2,0],9+scaling*2,3,2,"skeleton")
 if index>=3: add_enemy("e4","Hollow marksman",[6,1],12+scaling,4,4,"archer")
 plan_enemies()
 log_event("The company arrives. Inspect red markers before committing your orders.")
 message = "Select a hero, choose an order, then a target tile."
 return true

func add_enemy(id: String, title: String, pos: Array, hp: int, power: int, reach: int, role: String):
 battle.units.append(unit(id,title,"enemy",pos,hp,power,reach,role))

func get_unit(id: String) -> Dictionary:
 for u in battle.get("units",[]):
  if u.id==id: return u
 return {}

func at(pos: Array) -> Dictionary:
 for u in battle.get("units",[]):
  if u.hp>0 and u.pos==pos: return u
 return {}

func distance(a: Array,b: Array) -> int:
 return absi(int(a[0])-int(b[0])) + absi(int(a[1])-int(b[1]))

func valid_cell(pos: Array) -> bool:
 return pos.size()==2 and pos[0]>=0 and pos[1]>=0 and pos[0]<WIDTH and pos[1]<HEIGHT

func reachable(u: Dictionary, limit: int) -> Array:
 var seen = [u.pos]
 var queue = [[u.pos,0]]
 var result = []
 while not queue.is_empty():
  var current = queue.pop_front()
  if current[1]>=limit: continue
  for d in [[1,0],[-1,0],[0,1],[0,-1]]:
   var next = [current[0][0]+d[0],current[0][1]+d[1]]
   if not valid_cell(next) or next in seen or next in battle.blocked or not at(next).is_empty(): continue
   seen.append(next)
   result.append(next)
   queue.append([next,current[1]+1])
 return result

func line_clear(a: Array, b: Array) -> bool:
 # Supercover traversal: cover on either side of a crossed corner blocks a shot.
 var x = int(a[0])
 var y = int(a[1])
 var dx = absi(int(b[0])-x)
 var dy = absi(int(b[1])-y)
 var sx = signi(int(b[0])-x)
 var sy = signi(int(b[1])-y)
 var ix = 0
 var iy = 0
 while ix<dx or iy<dy:
  var test = (1+2*ix)*dy-(1+2*iy)*dx
  if test==0:
   if [x+sx,y] in battle.blocked or [x,y+sy] in battle.blocked: return false
   x+=sx
   y+=sy
   ix+=1
   iy+=1
  elif test<0:
   x+=sx
   ix+=1
  else:
   y+=sy
   iy+=1
  if [x,y] in battle.blocked: return false
 return true

func abilities(id: String) -> Array:
 var u = get_unit(id)
 if u.is_empty(): return []
 var out = ["strike","guard"]
 if u.role!="ballista": out.push_front("move")
 for item in campaign.placements:
  if ITEMS[item].owner==id and ITEMS[item].ability!="": out.append(ITEMS[item].ability)
 if id=="fen" and level()>=4: out.append("gust" if u.role=="owl" else "pin")
 if id=="rowan" and level()>=5: out.append("rally")
 return out

func ability_info(ability: String, id: String) -> Dictionary:
 var u = get_unit(id)
 var result = {"name":ability.capitalize(),"cost":1,"range":1,"damage":0,"desc":""}
 match ability:
  "move": result.merge({"name":"Advance","range":3,"desc":"Move up to 3 tiles. Occupied tiles and cover block your path."},true)
  "strike": result.merge({"name":"Strike","range":u.get("range",1),"damage":u.get("power",0),"desc":"Reliable basic attack. Always available."},true)
  "guard": result.merge({"name":"Guard","range":0,"desc":"Gain 5 shield until your next round. Ends this hero's orders."},true)
  "cleave": result.merge({"name":"Ember cleave","cost":2,"damage":7,"desc":"Hit every adjacent enemy. Once per round."},true)
  "pierce": result.merge({"name":"True shot","cost":2,"range":5,"damage":8,"desc":"A powerful aimed shot. Once per round."},true)
  "spark": result.merge({"name":"Storm bolt","cost":2,"range":4,"damage":7,"desc":"A focused bolt of lightning. Once per round."},true)
  "ward": result.merge({"name":"Bulwark","range":2,"desc":"Grant an ally 7 shield. Once per round."},true)
  "mend": result.merge({"name":"Mend","cost":2,"range":3,"desc":"Restore 7 health to an ally. Once per round."},true)
  "pin": result.merge({"name":"Pin down","damage":3,"desc":"Bite and cancel the target's next intent. Once per round."},true)
  "frost": result.merge({"name":"Icebind","cost":2,"range":4,"damage":5,"desc":"Freeze a foe and cancel its next intent. Once per round."},true)
  "gust": result.merge({"name":"Gust","range":3,"damage":3,"desc":"Talon disrupts a distant enemy, cancelling its next intent."},true)
  "rally": result.merge({"name":"Rally","cost":2,"range":0,"desc":"Every other living ally gains 1 AP (up to 2) and 3 shield. Once per round."},true)
 var weapon = {"cleave":"blade","pierce":"bow","spark":"staff","ward":"ward","mend":"flask","frost":"frost"}.get(ability,"")
 if weapon!="":
  result.damage += int(campaign.items.get(weapon,0))*2
  if empowered(weapon) and ability in ["cleave","pierce","spark"]:
   result.damage+=2
   result.desc+=" Storm-linked: chains 2 damage to one nearby enemy."
 return result

func action_error(id: String, ability: String, target: Array) -> String:
 if battle.is_empty() or battle.phase!="playing": return "There is no active battle."
 var u = get_unit(id)
 if u.is_empty() or u.hp<=0 or u.team!="ally": return "Select a living member of your warband."
 if ability not in abilities(id): return "Pack the required equipment at camp to use this order."
 var info = ability_info(ability,id)
 if u.ap<info.cost: return "Not enough action points. Choose another hero or end the round."
 if ability in u.used: return "That equipment ability was used this round."
 if not valid_cell(target): return "Choose a battlefield tile."
 if ability=="move":
  if target not in reachable(u,3): return "That tile is occupied, blocked, or more than 3 steps away."
  return ""
 if ability in ["guard","rally"]: return ""
 if distance(u.pos,target)>info.range: return "Target is out of range."
 if not line_clear(u.pos,target): return "Stone cover blocks that line of fire."
 var victim = at(target)
 if victim.is_empty(): return "Choose a unit, not an empty tile."
 if ability in ["ward","mend"]:
  if victim.team!="ally": return "Choose an ally for this order."
  if ability=="mend" and victim.hp==victim.max_hp: return "That ally is already at full health."
 elif victim.team=="ally": return "Choose an enemy for this attack."
 return ""

func act(id: String, ability: String, target: Array) -> bool:
 var error = action_error(id,ability,target)
 if error!="": return fail(error)
 var u = get_unit(id)
 var info = ability_info(ability,id)
 u.ap-=info.cost
 var victim = at(target)
 match ability:
  "move":
   u.pos=target.duplicate()
   log_event(u.name+" advances.")
  "guard":
   u.shield+=5
   u.ap=0
   log_event(u.name+" guards (+5 shield).")
  "ward":
   victim.shield+=7+int(campaign.items.get("ward",0))*2
   log_event(u.name+" protects "+victim.name+".")
  "mend":
   victim.hp=mini(victim.max_hp,victim.hp+7+int(campaign.items.get("flask",0))*2)
   log_event(u.name+" mends "+victim.name+".")
  "rally":
   for ally in battle.units:
    if ally.team=="ally" and ally.hp>0 and ally.id!=id:
     ally.ap=mini(2,int(ally.ap)+1)
     ally.shield+=3
   log_event("Rowan rallies the company: +1 AP and +3 shield.")
  _:
   var victims = [victim]
   if ability=="cleave":
    victims=[]
    for other in battle.units:
     if other.team=="enemy" and other.hp>0 and distance(u.pos,other.pos)<=1: victims.append(other)
   for v in victims: hurt(v,info.damage,u.name)
   if ability in ["pin","frost","gust"] and victim.hp>0:
    victim.intent={"kind":"stunned","target":victim.pos.duplicate()}
   var item = {"cleave":"blade","pierce":"bow","spark":"staff"}.get(ability,"")
   if item!="" and empowered(item):
    for other in battle.units:
     if other.team=="enemy" and other.hp>0 and other not in victims and distance(other.pos,target)<=2:
      hurt(other,2,"Storm rune")
      break
 if ability not in ["move","strike","guard"]: u.used.append(ability)
 check_outcome()
 message = "Order resolved. Enemy intentions stay fixed until the round ends."
 return true

func hurt(u: Dictionary, amount: int, source: String):
 var absorbed = mini(int(u.shield),amount)
 u.shield-=absorbed
 u.hp=maxi(0,int(u.hp)-amount+absorbed)
 log_event("%s → %s: %d damage%s" % [source,u.name,amount-absorbed," · defeated" if u.hp==0 else ""])

func plan_enemies():
 for e in battle.units:
  if e.team!="enemy" or e.hp<=0: continue
  var closest = {}
  var dist = 999
  for ally in battle.units:
   if ally.team=="ally" and ally.hp>0 and distance(e.pos,ally.pos)<dist:
    closest=ally
    dist=distance(e.pos,ally.pos)
  if is_defense() and int(e.pos[1])>=6:
   e.intent={"kind":"siege","target":[3,7]}
  elif not closest.is_empty() and dist<=e.range and line_clear(e.pos,closest.pos):
   e.intent={"kind":"attack","target":closest.pos.duplicate()}
  else:
   var goal = [3,7] if is_defense() else closest.get("pos",e.pos)
   var best = e.pos
   var best_dist = distance(best,goal)
   for p in reachable(e,2 if e.role!="boss" else 1):
    if distance(p,goal)<best_dist:
     best=p
     best_dist=distance(p,goal)
   e.intent={"kind":"move","target":best.duplicate()}

func end_round() -> bool:
 if battle.is_empty() or battle.phase!="playing": return false
 for e in battle.units:
  if e.team!="enemy" or e.hp<=0: continue
  var intent = e.intent
  match intent.get("kind",""):
   "attack":
    var victim = at(intent.target)
    if not victim.is_empty() and victim.team=="ally": hurt(victim,e.power,e.name)
    else: log_event(e.name+" strikes an abandoned tile.")
   "move":
    if at(intent.target).is_empty(): e.pos=intent.target.duplicate()
   "siege":
    battle.gate=maxi(0,int(battle.gate)-int(e.power))
    log_event(e.name+" damages the gate.")
   "stunned": log_event(e.name+" is pinned and loses its order.")
 check_outcome()
 if battle.phase!="playing": return true
 if is_defense() and int(battle.round)>=5:
  finish(true)
  return true
 battle.round+=1
 for u in battle.units:
  if u.team=="ally":
   u.ap=2 if u.role!="ballista" else 1
   u.shield=0
   u.used=[]
 if is_defense() and int(battle.round) in [2,4]:
  for pos in [[3,0],[6,0]]:
   if at(pos).is_empty(): add_enemy("wave%d_%d" % [battle.round,pos[0]],"Ash raider",pos.duplicate(),10,4,1,"skeleton")
  log_event("Reinforcements at the northern approach.")
 plan_enemies()
 log_event("Round %d. New enemy intentions revealed." % battle.round)
 message = "New round. Your company's action points are restored."
 return true

func check_outcome():
 var allies=0
 var enemies=0
 for u in battle.units:
  if u.hp<=0: continue
  if u.team=="ally" and u.role!="ballista": allies+=1
  if u.team=="enemy": enemies+=1
 if allies==0 or (is_defense() and battle.gate<=0): finish(false)
 elif enemies==0 and not is_defense(): finish(true)

func finish(won: bool):
 if battle.rewarded: return
 battle.phase="victory" if won else "defeat"
 battle.rewarded=true
 battle.reward=0
 if won:
  var old_level=level()
  var index=int(battle.mission)
  var first=int(campaign.wins[index])==0
  battle.reward=int(MISSIONS[index].reward) if first else int(MISSIONS[index].reward/2)
  campaign.gold+=battle.reward
  campaign.xp=mini((MAX_LEVEL-1)*XP_PER_LEVEL,int(campaign.xp)+(int(MISSIONS[index].xp) if first else 35))
  campaign.wins[index]+=1
  campaign.unlocked=mini(MISSIONS.size()-1,maxi(int(campaign.unlocked),index+1))
  battle.new_level=level() if level()>old_level else 0
  if old_level<4 and level()>=4: campaign.items.frost=0
  log_event("Victory. +%d gold. The company grows stronger." % battle.reward)
 else: log_event("The company withdraws. Your equipment and progress are safe.")

func return_to_camp() -> bool:
 if battle.is_empty(): return false
 if battle.phase=="playing": return fail("Retreat first to leave an active mission.")
 battle={}
 message="Home again. Reforge, repack, and choose your next expedition."
 return true

func retreat():
 if not battle.is_empty() and battle.phase=="playing": finish(false)

func log_event(text: String):
 battle.log.append(text)
 if battle.log.size()>30: battle.log.pop_front()

func fail(text: String) -> bool:
 message=text
 return false

func snapshot() -> Dictionary:
 return {"version":VERSION,"campaign":campaign.duplicate(true),"battle":battle.duplicate(true)}

func integer_in(value, low: int, high: int) -> bool:
 return (value is int or value is float) and is_finite(float(value)) and float(value)==floor(float(value)) and value>=low and value<=high

func valid_pos(p) -> bool:
 return p is Array and p.size()==2 and integer_in(p[0],0,7) and integer_in(p[1],0,7)

func validate_save(data) -> String:
 if not data is Dictionary or not integer_in(data.get("version"),VERSION,VERSION): return "Save format is unrecognized."
 var c=data.get("campaign")
 if not c is Dictionary: return "Campaign data is missing."
 for key in ["gold","xp","unlocked"]:
  if not integer_in(c.get(key),0,MISSIONS.size()-1 if key=="unlocked" else 10000000): return "Invalid campaign "+key
 if not c.get("mage") is bool or c.get("talent") not in ["","might","resolve"]: return "Invalid warband."
 if not c.get("wins") is Array or c.wins.size()!=MISSIONS.size(): return "Invalid campaign victories."
 if c.get("pet") not in ["wolf","owl"]: return "Invalid pet."
 for n in c.wins:
  if not integer_in(n,0,1000000): return "Invalid victory count."
 if not c.get("items") is Dictionary or not c.get("placements") is Dictionary: return "Equipment data is missing."
 for id in c.items:
  if not ITEMS.has(id) or not integer_in(c.items[id],0,3): return "Invalid equipment."
 for id in c.placements:
  if not c.items.has(id): return "Packed item is not owned."
  var p=c.placements[id]
  if not p is Array or p.size()!=3: return "Invalid equipment placement."
  for n in p:
   if not integer_in(n,0,5): return "Invalid equipment coordinates."
  if p[2]>3: return "Invalid equipment rotation."
 # Overlap checks inspect the entire layout. Validate every record before any
 # geometry helper can read a malformed neighboring placement.
 for id in c.placements:
  var p=c.placements[id]
  if not can_place(id,int(p[0]),int(p[1]),int(p[2]),c.placements): return "Equipment overlaps or leaves the chest."
 var b=data.get("battle")
 if not b is Dictionary: return "Battle data is missing."
 if b.is_empty(): return ""
 if not integer_in(b.get("mission"),0,MISSIONS.size()-1) or not integer_in(b.get("round"),1,100000) or not integer_in(b.get("gate"),0,24): return "Invalid mission."
 if b.get("phase") not in ["playing","victory","defeat"] or not b.get("rewarded") is bool: return "Invalid battle phase."
 if b.rewarded != (b.phase!="playing"): return "Inconsistent reward state."
 if not b.get("units") is Array or b.units.size()>30 or b.units.is_empty(): return "Invalid units."
 if not b.get("blocked") is Array or not b.get("log") is Array or b.log.size()>30: return "Invalid battlefield."
 for p in b.blocked:
  if not valid_pos(p): return "Invalid cover."
 for text in b.log:
  if not text is String: return "Invalid battle log."
 var ids=[]
 var positions=[]
 for u in b.units:
  if not u is Dictionary: return "Invalid unit record."
  if not u.get("id") is String or u.id in ids or not u.get("name") is String: return "Invalid unit identity."
  ids.append(u.id)
  if u.get("team") not in ["ally","enemy"] or u.get("role") not in ["captain","ranger","mage","wolf","owl","ballista","skeleton","archer","boss"]: return "Invalid unit role."
  for k in ["hp","max_hp","power","range","ap","shield"]:
   if not integer_in(u.get(k),0,100000): return "Invalid unit stats."
  if u.hp>u.max_hp or u.max_hp<1 or u.ap>2 or not valid_pos(u.get("pos")): return "Invalid unit position or health."
  if u.hp>0:
   if u.pos in positions or u.pos in b.blocked: return "Overlapping units."
   positions.append(u.pos)
  if not u.get("used") is Array or not u.get("intent") is Dictionary: return "Invalid unit orders."
  for a in u.used:
   if a not in ["cleave","pierce","spark","ward","mend","pin","frost","rally","gust"]: return "Unknown ability."
  if u.team=="enemy":
   if u.intent.get("kind") not in ["attack","move","siege","stunned"] or not valid_pos(u.intent.get("target")): return "Invalid enemy intent."
 if b.phase!="playing" and not integer_in(b.get("reward"),0,100000): return "Invalid reward."
 return ""

func restore(data) -> bool:
 var error=validate_save(data)
 if error!="": return fail(error)
 campaign=normalize_numbers(data.campaign)
 battle=normalize_numbers(data.battle)
 return true

func normalize_numbers(value):
 if value is float: return int(value)
 if value is Array:
  return value.map(func(v): return normalize_numbers(v))
 if value is Dictionary:
  var result={}
  for key in value: result[key]=normalize_numbers(value[key])
  return result
 return value

func save_to(path: String) -> bool:
 if save_locked: return false
 var data=JSON.stringify(snapshot())
 var file=FileAccess.open(path+".tmp",FileAccess.WRITE)
 if file==null:
  save_error="Could not save. Check free disk space and folder permissions."
  return false
 file.store_string(data)
 file.flush()
 var error=file.get_error()
 file.close()
 if error!=OK or DirAccess.rename_absolute(path+".tmp",path)!=OK:
  save_error="Could not replace the save. Your previous save is unchanged."
  return false
 save_error=""
 return true

func load_from(path: String) -> bool:
 if not FileAccess.file_exists(path): return true
 var file=FileAccess.open(path,FileAccess.READ)
 if file==null:
  save_error="Save cannot be read. Original file preserved; saving is disabled."
  save_locked=true
  return false
 var parser=JSON.new()
 var parsed=parser.parse(file.get_as_text())
 var data=parser.data if parsed==OK else null
 var error=validate_save(data)
 if error!="":
  save_error=error+" Original preserved at "+path+". Saving is disabled; repair or move that file before relaunching."
  save_locked=true
  return false
 return restore(data)
