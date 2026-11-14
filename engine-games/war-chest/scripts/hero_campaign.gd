class_name HeroCampaign
extends "res://scripts/pocket_campaign.gd"
## Optional progression snapshots keep pre-upgrade active saves unchanged.
const MASTERY_HEROES=["rowan","lysa","fen","merrin"]
const Coach=preload("res://scripts/pocket_coach.gd")
const MASTERY_THRESHOLDS=[2,5,9]
const RANK_NAMES=["0","I","II","III"]
const OBJECTIVES={
 "gate":"Win with at least 25 gate health",
 "company":"Win with every hero standing",
 "swift":"Win by the end of turn 5",
 "maneuver":"Win after moving 3 different heroes",
 "control":"Win after stunning 3 different living foes"
}

func new_campaign():
 super()
 campaign.mastery={}
 campaign.lessons=0

func play(actor: String,card: String,target: String) -> bool:
 if not super.play(actor,card,target): return false
 var learned=0
 if COMMANDS[card].target=="enemy" and card!="gust": learned|=Coach.ATTACK
 if card=="volley" and ally(actor).lane!=foe(target).lane: learned|=Coach.RANGE
 if card in ["guard","ward","rally"]: learned|=Coach.BLOCK
 campaign.lessons=int(campaign.get("lessons",Coach.COMPLETE))|learned
 return true

func resolve() -> bool:
 if not super.resolve(): return false
 campaign.lessons=int(campaign.get("lessons",Coach.COMPLETE))|Coach.TURN
 return true

func mastery_wins(id: String) -> int:
 return int(campaign.get("mastery",{}).get(id,0))

func rank_from_wins(wins: int) -> int:
 var rank=0
 for threshold in MASTERY_THRESHOLDS:
  if wins>=threshold: rank+=1
 return rank

func mastery_rank(id: String) -> int:
 if not battle.is_empty(): return int(ally(id).get("mastery",0))
 return rank_from_wins(mastery_wins(id))

func mastery_progress(id: String) -> String:
 var rank=rank_from_wins(mastery_wins(id))
 return "Mastery III\nComplete" if rank==3 else "Mastery %s\n%d/%d wins to %s" % [RANK_NAMES[rank],mastery_wins(id),MASTERY_THRESHOLDS[rank],RANK_NAMES[rank+1]]

func mastery_effect(id: String,rank: int) -> String:
 var effect={
  "rowan":"Guard gives other allies on this front +%d block.",
  "lysa":"Volley deals +%d damage to stunned foes.",
  "fen":"Strike restores %d of your own health.",
  "merrin":"Heal also gives its target %d block."
 }.get(id,"")
 return effect % (rank*2) if effect!="" else ""

func begin(index: int) -> bool:
 if not super.begin(index): return false
 for h in battle.heroes: h.mastery=rank_from_wins(mastery_wins(h.id))
 battle.mastery_rules=true
 assign_objective(["gate","swift","company","maneuver","control","company"][index],20+index*5)
 return true

func begin_contract(id: String,tier: int) -> bool:
 if not super.begin_contract(id,tier): return false
 var choices=["gate","company","control"] if id=="siege" else ["swift","maneuver","company"]
 assign_objective(choices[int(war().contracts)%3],25+tier*5)
 return true

func assign_objective(id: String,gold: int):
 battle.objective={"id":id,"gold":gold,"moved":[],"stunned":[],"paid":false}
 battle.mastery_awards=[]

func objective_met() -> bool:
 if not battle.has("objective"): return false
 var objective=battle.objective
 match objective.id:
  "gate": return battle.gate>=25
  "swift": return battle.round<=5
  "company":
   for h in battle.heroes:
    if h.id in MASTERY_HEROES and h.hp<=0: return false
   return true
  "maneuver": return objective.moved.size()>=3
  "control": return objective.stunned.size()>=3
 return false

func objective_text() -> String:
 if not battle.has("objective"): return ""
 var o=battle.objective
 if (o.id=="swift" and battle.round>5) or (o.id=="company" and not objective_met()) or (o.id=="gate" and battle.gate<25):
  return "Bonus missed this battle · no penalty"
 var progress=""
 if o.id=="maneuver": progress=" (%d/3)" % o.moved.size()
 if o.id=="control": progress=" (%d/3)" % o.stunned.size()
 return "+%d gold: %s%s" % [o.gold,OBJECTIVES[o.id],progress]

func damage_against(actor: String,card: String,enemy: Dictionary) -> int:
 var amount=super.damage_against(actor,card,enemy)
 if actor=="lysa" and card=="volley" and enemy.stunned: amount+=mastery_rank(actor)*2
 return amount

func after_command(actor: String,card: String,target: String):
 if not battle.get("mastery_rules",false): return
 var rank=mastery_rank(actor);var h=ally(actor)
 if actor=="rowan" and card=="guard":
  for other in battle.heroes:
   if other.id!=actor and other.hp>0 and other.lane==h.lane: other.shield+=rank*2
 elif actor=="fen" and card=="strike": h.hp=mini(h.max_hp,h.hp+rank*2)
 elif actor=="merrin" and card=="mend": ally(target).shield+=rank*2
 if card in ["spark","pin","frost","gust"]:
  var e=foe(target)
  if e.hp>0 and target not in battle.objective.stunned: battle.objective.stunned.append(target)

func reposition(actor: String,lane: int) -> bool:
 if not super.reposition(actor,lane): return false
 if battle.has("objective") and actor not in battle.objective.moved: battle.objective.moved.append(actor)
 return true

func settle(won: bool):
 if battle.rewarded: return
 var upgraded=battle.get("mastery_rules",false)
 var bonus=won and upgraded and objective_met()
 super.settle(won)
 if not won or not upgraded: return
 if bonus:
  var gold=int(battle.objective.gold)
  campaign.gold+=gold;battle.reward+=gold;battle.objective.paid=true
  log_event("Bonus objective complete · +%d gold" % gold)
 for h in battle.heroes:
  if h.id not in MASTERY_HEROES: continue
  var before=rank_from_wins(mastery_wins(h.id))
  campaign.mastery[h.id]=mini(9,mastery_wins(h.id)+1)
  var after=rank_from_wins(mastery_wins(h.id))
  if after>before: battle.mastery_awards.append("%s: mastery %s" % [h.name,RANK_NAMES[after]])

func card_text(actor: String,card: String) -> String:
 var description=super.card_text(actor,card)
 if mastery_rank(actor)>0 and ((actor=="rowan" and card=="guard") or (actor=="lysa" and card=="volley") or (actor=="fen" and card=="strike") or (actor=="merrin" and card=="mend")):
  description+="\n"+mastery_effect(actor,mastery_rank(actor))
 return description

func restore(data) -> bool:
 if not super.restore(data): return false
 if not campaign.has("mastery"): campaign.mastery={}
 # Existing campaigns are not silently enrolled in a new tutorial.
 if not campaign.has("lessons"): campaign.lessons=Coach.COMPLETE
 return true

func validate_save(data) -> String:
 var error=super.validate_save(data)
 if error!="": return error
 if data.campaign.has("lessons") and not integer_in(data.campaign.lessons,0,Coach.COMPLETE): return "Invalid field lesson progress."
 var mastery=data.campaign.get("mastery",{})
 if not mastery is Dictionary: return "Invalid hero mastery."
 for id in mastery:
  if id not in MASTERY_HEROES or not integer_in(mastery[id],0,9): return "Invalid mastery progress."
 var b=data.battle
 if b.is_empty(): return ""
 if b.has("mastery_rules") and not b.mastery_rules is bool: return "Invalid mastery rules."
 if not b.get("mastery_rules",false):
  if b.has("objective") or b.has("mastery_awards"): return "Progression requires mastery rules."
  for h in b.heroes:
   if h.has("mastery"): return "Hero mastery requires battle rules."
 if b.get("mastery_rules",false):
  if not b.has("objective") or not b.get("mastery_awards") is Array: return "Missing battle progression."
  if b.mastery_awards.size()>4: return "Invalid mastery awards."
  for entry in b.mastery_awards:
   if not entry is String or entry.length()>80: return "Invalid mastery award."
  for h in b.heroes:
   if not integer_in(h.get("mastery"),0,3): return "Invalid battle mastery."
 if b.has("objective"):
  var o=b.objective
  if not o is Dictionary or not OBJECTIVES.has(o.get("id")) or not integer_in(o.get("gold"),20,50) or not o.get("paid") is bool: return "Invalid bonus objective."
  if o.paid and b.phase!="victory": return "Objective bonus requires victory."
  for key in ["moved","stunned"]:
   if not o.get(key) is Array or o[key].size()>(4 if key=="moved" else 100): return "Invalid objective progress."
   var seen=[]
   for id in o[key]:
    if not id is String or id in seen: return "Invalid objective member."
    seen.append(id)
    var found=false
    for u in b.heroes if key=="moved" else b.enemies:
     if u.id==id and (key!="moved" or id in MASTERY_HEROES): found=true
    if not found: return "Unknown objective member."
 return ""
