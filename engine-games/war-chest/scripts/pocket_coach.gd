extends RefCounted
## Read-only contextual teaching. Never restricts legal commands.
const ATTACK=1
const RANGE=2
const BLOCK=4
const TURN=8
const COMPLETE=15
const StoryData=preload("res://scripts/story_data.gd")
const UNLOCKS={
 2:["Merrin · recruit for 60 gold, then pack his Storm staff.","Talent · choose +1 damage or +4 health for free.","Also open: side quests, contracts and forge rank I."],
 3:["Ballista · buy for 85 gold and pack it to deploy.","Medicine · buy for 35 gold; Merrin needs it packed to heal.","Also open: forge rank II."],
 4:["Fen's Pin down · ready now; strike and stun on his front.","Frostfang · free in storage; pack it for Lysa's Freeze."],
 5:["Rally · ready now; Rowan gives every ally 4 block.","Seven orders per turn · ready now. Forge rank III is open."],
 6:["Talon · choose the owl at Recruit & upgrade, for free.","Gust · Talon can stun a foe on any front.","Final campaign challenge: The Hollow Crown."]
}
const STORY_UNLOCKS={
 2:"Choose a free lasting talent at the quartermaster. Forge +1 is open; upgrades cost company gold. Merrin joins later at the archive.",
 3:"Buy the ballista for 85 gold or medicine for 35 gold, then pack it. Merrin uses packed medicine to heal after he joins. Forge +2 is open.",
 4:"Fen's Pin is ready next battle. Frostfang is free in storage; pack it for Lysa's Freeze. Every companion gains 2 starting max HP.",
 5:"Rowan's Rally and seven shared orders are ready next battle. Forge +3 is open. Pack the recovered Watcher's lens for +3 ranged damage on a clear front.",
 6:"Company level 6 is the cap; companion mastery keeps growing. Finish Crown, Engine and homecoming. Fen stays until then; Talon opens after the ending."
}

static func role_text(game,id: String) -> String:
 if id=="fen": return "Wolf · fights on his front" if game.campaign.pet=="wolf" else "Owl · ranged disruption"
 return {"rowan":"Melee & protection","lysa":"Ranged support","merrin":"Storm & healing through packed gear","ballista":"Ranged siege support"}.get(id,"")

static func story_progress(game) -> String:
 if game.level()>=6: return "Company level 6/6 · Final level. Companion mastery still grows."
 for index in range(int(game.campaign.story.node),StoryData.NODES.size()):
  var node=StoryData.NODES[index]
  if node.id not in game.campaign.story.completed and node.xp>0:
   return "Company level %d/6 · Next: %s → level %d." % [game.level(),node.title,game.level()+1]
 return "Company level %d/6" % game.level()

static func hint(game,selected: String,chosen: String) -> Dictionary:
 if game.battle.is_empty() or game.battle.phase!="playing" or game.level()!=1: return {}
 var bits=int(game.campaign.get("lessons",COMPLETE))
 if bits==COMPLETE: return {}
 var step=1
 for bit in [ATTACK,RANGE,BLOCK,TURN]:
  if bits & bit: step+=1
 var heading="Field lesson %d/4" % step
 if game.battle.commands==0:
  return {"heading":heading+" · Refresh your orders","body":"No orders left. Choose End turn: enemies act, then your six orders return."}
 if chosen!="": return {"heading":heading+" · Choose a target","body":"Click a troop, or T to preview a legal target and F to confirm. Esc cancels; Z undoes your last order."}
 if game.battle.get("story",{}).get("node","")=="gate":
  var alive=game.battle.enemies.filter(func(enemy):return enemy.hp>0)
  if alive.is_empty():
   var next="Choose End turn to bring the last families through." if game.battle.round>=game.encounter().rounds else "Choose End turn to move the families onward. New waves reach Lysa and Fen; everyone shares the same orders."
   return {"heading":heading+" · The crossing is clear","body":("Lysa's cards are now shown. " if selected=="lysa" else "")+next}
  var introduced=alive.size()==2 and alive.all(func(enemy):return game.reason("rowan","cleave",enemy.id)=="" and game.damage_against("rowan","cleave",enemy)>=enemy.hp)
  if bits==0 and introduced and game.reason("rowan","ward")=="":
   var incoming=0
   for enemy in alive:
    if enemy.target=="rowan" and not enemy.stunned:incoming+=game.attack_power(enemy)
   return {"heading":heading+" · Protect the crossing","body":("Rowan is selected. " if selected=="rowan" else "Choose Rowan [1]. ")+"Portraits or 1–5 switch freely. Shield → Rowan absorbs the %d incoming damage; Cleave defeats both raiders." % incoming}
 if not bits & ATTACK:
  if game.reason("rowan","cleave")=="":
   for e in game.battle.enemies:
    if game.reason("rowan","cleave",e.id)=="":
     return {"heading":heading+" · Select: portraits or 1–5","body":("Rowan is selected. Click a bottom portrait or press 1–5 to switch freely. Cleave → a foe on front %d hits the whole front (2 orders)." if selected=="rowan" else "Click Rowan's bottom portrait or press 1. His command cards appear. Cleave → a foe on front %d hits the whole front (2 orders).") % (int(game.ally("rowan").lane)+1)}
  for h in game.battle.heroes:
   for e in game.battle.enemies:
    if game.reason(h.id,"strike",e.id)=="":
     return {"heading":heading+" · Make your first attack","body":"Select %s → Strike → a foe on front %d. Z undoes your last order." % [h.name,int(h.lane)+1]}
 if not bits & RANGE and game.ally("lysa").hp>0 and game.reason("lysa","volley")=="":
  for e in game.battle.enemies:
   if e.hp>0 and e.lane!=game.ally("lysa").lane:
    return {"heading":heading+" · Switch to ranged support","body":"Lysa's cards are now shown. Choose Volley → a foe on another front (2 orders). Keep her bow packed to retain Volley." if selected=="lysa" else "Switch to Lysa: click her bottom portrait or press 2. Volley → a foe on another front. All companions share the six orders."}
 if not bits & BLOCK:
  for h in game.battle.heroes:
   if game.reason(h.id,"guard")=="":
    return {"heading":heading+" · Read the enemy's plan","body":"The arrow under a foe names its target. Select a threatened hero → Guard: 6 block for this enemy turn."}
 if not bits & TURN:
  return {"heading":heading+" · Let the enemy respond","body":"Spend your remaining orders, then End turn. Block absorbs damage; unused block expires. Hold out for 4 turns."}
 if not bits & RANGE and not game.campaign.placements.has("bow"):
  return {"heading":heading+" · Ranged lesson needs a bow","body":"Lysa's bow is stored. Finish this fight, then Pack equipment at the keep to restore Volley. You can skip lessons at any time."}
 if not bits & RANGE and game.ally("lysa").hp<=0:
  return {"heading":heading+" · Lysa returns next battle","body":"Lysa is down, so the ranged lesson must wait. Keep the gate standing; fallen heroes return for your next battle."}
 return {"heading":heading+" · Plan your next turn","body":"No lesson action is available now. Spend useful orders, then End turn. New waves arrive on turns 2 and 4; hold out through turn 4."}

static func unlock_text(level: int,authored_story: bool=false) -> String:
 return STORY_UNLOCKS.get(level,"") if authored_story else "\n".join(UNLOCKS.get(level,[]))
