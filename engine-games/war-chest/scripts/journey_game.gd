class_name JourneyGame
extends "res://scripts/hero_campaign.gd"
## Optional rules snapshot: old active saves keep their original battles.
const RELICS=["pennant","aegis","lens"]
const TIER_QUESTS=["","convoy","beacons","citadel","engine"]
var resolution_start={}
var hazard_absorbed={}
var enemy_turn_started=true
const QUESTS={
 "scout":{"name":"The Missing Scout","chapter":1,"after":0,"requires":"","kind":"DEFENSE","rounds":5,"gold":90,"relic":"pennant","desc":"Pip is stranded on front 3. Send Rowan to collect him, then bring Rowan back to front 1 alive.","reward":"Scout's pennant · first move each turn is free when packed."},
 "convoy":{"name":"The Last Supply Cart","chapter":1,"after":0,"requires":"scout","kind":"DEFENSE","rounds":6,"gold":115,"relic":"","desc":"Escort the cart with Rowan through fronts 1 → 2 → 3 → 1. Each missed escort costs 5 gate health.","reward":"Contract tier II opens; earn gold, mastery and a banner."},
 "relic":{"name":"The Sunken Reliquary","chapter":2,"after":1,"requires":"","kind":"DEFENSE","rounds":6,"gold":140,"relic":"aegis","desc":"Keep a living, shielded hero on front 3 for three enemy turns to recover the Dawn aegis.","reward":"Dawn aegis · Guard grants 4 extra block when packed."},
 "beacons":{"name":"Light the Watchfires","chapter":2,"after":2,"requires":"relic","kind":"DEFENSE","rounds":6,"gold":160,"relic":"","desc":"Move heroes into each of the three fronts. A beacon lights after the arriving hero survives the enemy turn.","reward":"Contract tier III opens; earn gold, mastery and a banner."},
 "citadel":{"name":"The Iron Oath","chapter":3,"after":3,"requires":"","kind":"ASSAULT","rounds":8,"gold":180,"relic":"lens","desc":"Defeat the iron patrol. Rotating bombardments hit one front each turn: move out or absorb the blast with block.","reward":"Watcher's lens and contract tier IV. Packed lens rewards firing from a clear front."},
 "engine":{"name":"Break the Siege Engine","chapter":3,"after":5,"requires":"citadel","kind":"ASSAULT","rounds":9,"gold":240,"relic":"","desc":"Defeat the commander and escorts. Living escorts reduce hits on the commander by 4. Move or shield against rotating bombardments.","reward":"Contract tier V opens without renown grinding. Complete the company's side-story."}
}

func new_campaign():
 super()
 campaign.journey={"completed":[]}

func quest_done(id: String) -> bool:
 return id in campaign.get("journey",{}).get("completed",[])

func quest_lock(id: String) -> String:
 if not QUESTS.has(id): return "Unknown side quest."
 var q=QUESTS[id]
 if campaign.wins[q.after]==0: return "Win campaign battle %d first." % (q.after+1)
 if q.requires!="" and not quest_done(q.requires): return "Complete %s first." % QUESTS[q.requires].name
 return ""

func max_tier() -> int:
 var tier=super.max_tier()
 for i in range(1,TIER_QUESTS.size()):
  if quest_done(TIER_QUESTS[i]): tier=maxi(tier,i+1)
 return tier

func tier_unlock_text(tier: int) -> String:
 return "Available at level 2" if tier==1 else "%d renown or %s" % [(tier-1)*6,QUESTS[TIER_QUESTS[tier-1]].name]

func begin(index: int) -> bool:
 if not super.begin(index): return false
 battle.journey_rules=true;battle.march_used=false
 battle.relics=[]
 for id in RELICS:
  if campaign.placements.has(id): battle.relics.append(id)
 return true

func begin_quest(id: String) -> bool:
 if not battle.is_empty(): return fail("Finish or retreat from the current battle first.")
 var locked=quest_lock(id)
 if locked!="": return fail(locked)
 if not begin(0): return false
 var q=QUESTS[id]
 battle.quest={"id":id,"progress":0,"pending":0}
 battle.mission=q.after
 battle.enemies=[];battle.serial=0
 for lane in range(3):
  spawn(lane,q.kind=="ASSAULT" and lane==1)
  if q.kind=="ASSAULT": spawn(lane,false)
 assign_objective("company",25)
 plan();message=q.desc
 return true

func encounter() -> Dictionary:
 if battle.has("quest"): return QUESTS[battle.quest.id]
 return super.encounter()

func packed_relic(id: String) -> bool:
 return battle.get("journey_rules",false) and id in battle.get("relics",[])

func free_march() -> bool:
 return packed_relic("pennant") and not battle.get("march_used",false)

func move_reason(actor: String) -> String:
 var h=ally(actor)
 if h.is_empty() or h.hp<=0 or actor=="ballista": return "Choose a living hero."
 if h.shifted: return "Already moved this turn."
 if battle.commands<1 and not free_march(): return "Not enough orders."
 return ""

func reposition(actor: String,lane: int) -> bool:
 var free=free_march();var orders=int(battle.get("commands",0))
 if free and orders==0: battle.commands=1
 if not super.reposition(actor,lane):
  if free: battle.commands=orders
  return false
 if free: battle.commands=orders;battle.march_used=true
 return true

func resolve() -> bool:
 resolution_start={};hazard_absorbed={};enemy_turn_started=true
 if not super.resolve(): return false
 if battle.get("journey_rules",false): battle.march_used=false
 return true

func after_command(actor: String,card: String,target: String):
 super.after_command(actor,card,target)
 if card=="guard" and packed_relic("aegis"): ally(actor).shield+=4

func damage_against(actor: String,card: String,e: Dictionary) -> int:
 var damage=super.damage_against(actor,card,e)
 if packed_relic("lens") and card in ["volley","spark","frost","bolt"]:
  var clear=true
  for other in battle.enemies:
   if other.hp>0 and other.lane==ally(actor).lane: clear=false
  if clear: damage+=3
 if battle.get("quest",{}).get("id","")=="engine" and e.boss:
  for other in battle.enemies:
   if other.hp>0 and not other.boss: return maxi(1,damage-4)
 return damage

func card_text(actor: String,card: String) -> String:
 var description=super.card_text(actor,card)
 if card=="guard" and packed_relic("aegis"): description+="\nDawn aegis: +4 extra block."
 if card in ["volley","spark","frost","bolt"] and packed_relic("lens"): description+="\nWatcher's lens: +3 damage from a clear front."
 return description

func enemy_detail(e: Dictionary) -> String:
 var description=super.enemy_detail(e)
 if battle.get("quest",{}).get("id","")=="engine" and e.boss: description+=" Escorts reduce incoming hits by 4 while alive."
 return description

func hazard() -> Dictionary:
 if not battle.get("journey_rules",false) or battle.has("contract"): return {}
 var quest=battle.get("quest",{}).get("id","")
 if quest!="" and quest not in ["citadel","engine"]: return {}
 if quest=="" and battle.mission<2: return {}
 return {"lane":posmod(int(battle.round)-1,3),"damage":8+int(battle.mission/2)}

func battle_brief() -> String:
 if battle.has("quest"):
  var q=battle.quest;var remaining=QUESTS[q.id].rounds-int(battle.round)+1
  match q.id:
   "scout": return "Scout: Rowan → front %d · %d turns left" % [3 if q.progress==0 else 1,remaining]
   "convoy": return "Cart: Rowan → front %d · %d/4 stages · miss costs 5 gate HP" % [[1,2,3,1][mini(q.progress,3)],q.progress]
   "relic": return "Relic: shield a hero on front 3 · %d/3 charges · %d turns left" % [q.progress,remaining]
   "beacons":
    var fronts=[]
    for lane in range(3):
     if not q.progress & (1<<lane): fronts.append(str(lane+1))
    return "Beacons: move into fronts %s and survive · %d turns left" % [", ".join(fronts),remaining]
 var threat=hazard()
 return "Bombardment: front %d · %d damage after block. Move or shield." % [threat.lane+1,threat.damage] if not threat.is_empty() else ""

func before_enemy_turn():
 if not battle.get("journey_rules",false): return
 if battle.has("quest"):
  var q=battle.quest;q.pending=0
  match q.id:
   "scout":
    if ally("rowan").hp>0 and ally("rowan").lane==(2 if q.progress==0 else 0): q.pending=1
   "convoy":
    if ally("rowan").hp>0 and ally("rowan").lane==[0,1,2,0][mini(q.progress,3)]: q.pending=1
    else: battle.gate=maxi(0,battle.gate-5)
   "relic":
    for h in battle.heroes:
     if h.hp>0 and h.lane==2 and h.shield>0: q.pending|=1<<battle.heroes.find(h)
   "beacons":
    for h in battle.heroes:
     if h.hp>0 and h.shifted: q.pending|=1<<battle.heroes.find(h)
 var threat=hazard()
 if not threat.is_empty():
  for h in battle.heroes:
   if h.hp>0 and h.lane==threat.lane:
    var blocked=mini(h.shield,threat.damage);h.shield-=blocked
    hazard_absorbed[h.id]=blocked
    h.hp=maxi(0,h.hp-threat.damage+blocked)
  log_event("Bombardment hits front %d for %d before enemy attacks." % [threat.lane+1,threat.damage])
 outcome()
 enemy_turn_started=battle.phase=="playing"
 for h in battle.heroes: resolution_start[h.id]={"hp":h.hp,"shield":h.shield}

func after_enemy_turn():
 if not battle.has("quest"): return
 var q=battle.quest
 if q.id in ["scout","convoy"]:
  if ally("rowan").hp<=0:
   battle.quest_failure="Rowan fell before the %s was complete. Keep him alive through each enemy turn." % ("rescue" if q.id=="scout" else "escort")
   settle(false);return
  q.progress+=q.pending
 elif q.id in ["relic","beacons"]:
  var survived=false
  for i in range(battle.heroes.size()):
   var h=battle.heroes[i]
   if q.pending & (1<<i) and h.hp>0:
    survived=true
    if q.id=="beacons": q.progress|=1<<int(h.lane)
  if q.id=="relic" and survived: q.progress+=1
 q.pending=0
 var goal={"scout":2,"convoy":4,"relic":3,"beacons":7}.get(q.id,999)
 if q.progress>=goal: settle(true)
 elif battle.round>=QUESTS[q.id].rounds:
  var progress="Defeat every foe before the deadline."
  match q.id:
   "scout": progress="Bring Rowan to front 3, then back to front 1, surviving each enemy turn."
   "convoy": progress="Escort stages completed: %d/4. Rowan must follow the cart's next front." % q.progress
   "relic": progress="Relic charges recovered: %d/3. Shield a surviving hero on front 3." % q.progress
   "beacons":
    var lit=0
    for lane in range(3):
     if q.progress & (1<<lane): lit+=1
    progress="Watchfires lit: %d/3. Move heroes to unlit fronts and survive the enemy turn." % lit
  battle.quest_failure="Time ran out. "+progress
  settle(false)

func retreat():
 if not battle.is_empty() and battle.phase=="playing" and battle.has("quest"):
  battle.quest_failure="You withdrew from this quest. Your company and equipment are safe; try again when ready."
 super.retreat()

func settle_encounter(won: bool):
 if not battle.has("quest"): super.settle_encounter(won);return
 battle.phase="victory" if won else "defeat";battle.rewarded=true
 if not won:
  if not battle.has("quest_failure"):
   battle.quest_failure="The gate fell. Stop gate attackers and keep Rowan with the cart." if battle.gate<=0 and battle.quest.id=="convoy" else ("The gate fell. Stop gate attackers before resolving the next turn." if battle.gate<=0 else "The company fell. Protect your heroes with block, movement and stuns.")
  log_event(battle.quest_failure)
  return
 var id=battle.quest.id;var q=QUESTS[id];var first=not quest_done(id);var before=level()
 battle.reward=q.gold if first else int(q.gold/2)
 campaign.gold+=battle.reward
 if first:
  campaign.journey.completed.append(id)
  campaign.xp=mini(350,campaign.xp+35)
  if q.relic!="": campaign.items[q.relic]=0
  battle.quest_reward=q.reward
 else: battle.quest_reward="Replay complete · half gold, mastery and a banner. Unique reward already earned."
 if before<4 and level()>=4: campaign.items.frost=0
 battle.new_level=level() if level()>before else 0

func restore(data) -> bool:
 if not super.restore(data): return false
 if not campaign.has("journey"): campaign.journey={"completed":[]}
 return true

func validate_save(data) -> String:
 var error=super.validate_save(data)
 if error!="": return error
 var journey=data.campaign.get("journey",{"completed":[]})
 if not journey is Dictionary or not journey.get("completed") is Array or journey.completed.size()>6: return "Invalid side-quest progress."
 var seen=[]
 for id in journey.completed:
  if not id is String or not QUESTS.has(id) or id in seen: return "Invalid completed side quest."
  seen.append(id)
 for id in seen:
  if data.campaign.wins[QUESTS[id].after]==0: return "Side quest requires its campaign milestone."
  if QUESTS[id].requires!="" and QUESTS[id].requires not in seen: return "Missing earlier side quest."
 var b=data.battle
 if b.is_empty(): return ""
 if b.has("journey_rules") and not b.journey_rules is bool: return "Invalid journey rules."
 if b.get("journey_rules",false):
  if not b.get("march_used") is bool or not b.get("relics") is Array or b.relics.size()>3: return "Invalid battle relics."
  seen=[]
  for id in b.relics:
   if id not in RELICS or id in seen or not data.campaign.placements.has(id): return "Invalid packed relic."
   seen.append(id)
 elif b.has("quest") or b.has("relics") or b.has("march_used"): return "Missing journey rules."
 if b.has("quest"):
  var q=b.quest
  if b.has("contract") or not q is Dictionary or not QUESTS.has(q.get("id")): return "Invalid side quest."
  var limit={"scout":2,"convoy":4,"relic":3,"beacons":7,"citadel":0,"engine":0}[q.id]
  if not integer_in(q.get("progress"),0,limit) or not integer_in(q.get("pending"),0,31): return "Invalid quest objective."
  if b.mission!=QUESTS[q.id].after or not b.get("war_rules",false) or not b.get("mastery_rules",false): return "Invalid quest rules."
  if data.campaign.wins[QUESTS[q.id].after]==0 or (QUESTS[q.id].requires!="" and QUESTS[q.id].requires not in journey.completed): return "Quest route is locked."
 if b.has("quest_reward") and (not b.quest_reward is String or b.quest_reward.length()>240): return "Invalid quest reward."
 if b.has("quest_failure") and (not b.has("quest") or b.phase!="defeat" or not b.quest_failure is String or b.quest_failure.length()>240): return "Invalid quest failure."
 return ""
