extends "res://scripts/opening_game.gd"
## Additive authored campaign. Legacy saves never acquire story rules on restore.
const StoryData=preload("res://scripts/story_data.gd")
const STORY_VERSION=1
const STORY_PHASES=["intro","prepare","battle","outro","ending","complete"]
var _creation_enrollment=true
var _starting_story=false

func enroll_story() -> bool:
 if not _creation_enrollment or save_locked or campaign.has("story") or not battle.is_empty() or campaign.xp!=0: return false
 for count in campaign.wins:
  if count!=0: return false
 if not campaign.has("opening") and not enroll_opening(): return false
 campaign.story={"version":STORY_VERSION,"node":0,"phase":"intro","line":0,"completed":[],"decisions":{}}
 _creation_enrollment=false
 return true

func story_active() -> bool:
 return campaign.has("story") and campaign.story.phase!="complete"

func story_node() -> Dictionary:
 return StoryData.NODES[int(campaign.story.node)] if campaign.has("story") else {}

func story_lines() -> Array:
 if not campaign.has("story"): return []
 var s=campaign.story
 if s.phase=="ending": return StoryData.ending_lines(s.decisions)
 if s.phase in ["intro","outro"]: return story_node()[s.phase]
 return []

func story_line() -> Dictionary:
 var lines=story_lines()
 return lines[int(campaign.story.line)] if not lines.is_empty() else {}

func story_options() -> Array:
 if not story_active() or campaign.story.phase!="outro" or campaign.story.line!=story_lines().size()-1: return []
 var node=story_node()
 return [] if campaign.story.decisions.has(node.id) else node.choices

func choose_story_option(id: String) -> bool:
 if has_loot(): return fail("Claim your victory banner before deciding the company's next step.")
 for option in story_options():
  if option.id==id:
   campaign.story.decisions[story_node().id]=id
   message=option.consequence
   return true
 return fail("Choose one of the current story's options.")

func advance_story() -> bool:
 if not story_active(): return fail("The company is ready for free exploration.")
 var s=campaign.story
 if s.phase not in ["intro","outro","ending"]: return fail("Prepare the company or finish its current encounter first.")
 if has_loot(): return fail("Claim your victory banner before continuing the story.")
 var lines=story_lines()
 if s.line<lines.size()-1:
  s.line+=1
  return true
 if s.phase=="intro": s.phase="prepare";s.line=0;return true
 if s.phase=="outro":
  if not story_node().choices.is_empty() and not s.decisions.has(story_node().id): return fail("Choose what the company will do next.")
  if not battle.is_empty() and not super.return_to_camp(): return false
  if int(s.node)==StoryData.NODES.size()-1: s.phase="ending"
  else:
   s.node+=1;s.phase="intro"
   message="Next: %s. Repack gear at camp if you like, then march." % story_node().title
  s.line=0
  return true
 s.phase="complete";s.line=0
 message="The wages are home. The company is yours to lead in free exploration."
 return true

func begin(index: int) -> bool:
 if story_active() and not _starting_story: return fail("Continue the company's current story encounter first.")
 return super.begin(index)

func begin_quest(id: String) -> bool:
 if story_active() and not _starting_story: return fail("Continue the company's current story encounter first.")
 return super.begin_quest(id)

func begin_contract(id: String,tier: int) -> bool:
 if story_active(): return fail("War contracts open after the company brings the chest home.")
 return super.begin_contract(id,tier)

func story_item_lock(id: String) -> String:
 if story_active() and id=="staff" and not campaign.mage: return "Merrin brings a storm staff after the Sunken Reliquary."
 return ""

func story_pet_lock(id: String) -> String:
 return "Fen stays with the company until the wages are home. Talon joins free exploration after the epilogue." if story_active() and id=="owl" else ""

func choose_pet(id: String) -> bool:
 var locked=story_pet_lock(id)
 if locked!="": return fail(locked)
 return super.choose_pet(id)

func buy(id: String) -> bool:
 var locked=story_item_lock(id)
 if locked!="": return fail(locked)
 return super.buy(id)

func recruit() -> bool:
 if story_active() and not campaign.mage: return fail("Merrin joins the company after the Sunken Reliquary.")
 return super.recruit()

func begin_story_node() -> bool:
 if not story_active() or campaign.story.phase!="prepare" or not battle.is_empty(): return fail("Finish the current story scene before marching.")
 var node=story_node()
 if node.id=="ashen" and not (empowered("blade") or empowered("bow")): return fail("Pack the earned storm rune beside a weapon before following Ivo's trail.")
 _starting_story=true
 var started=super.begin(node.mission) if node.kind=="main" else super.begin_quest(node.quest)
 _starting_story=false
 if not started: return false
 battle.story={"version":STORY_VERSION,"node":node.id,"decisions":campaign.story.decisions.duplicate(true),"progress":0,"pending":0,"carrier":"","formation":[],"initial_gate":30}
 if node.id=="gate":
  # New story starts introduce one threatened crossing before the wave reaches
  # Lysa and Fen. Existing active saves restore their exact stored formation.
  battle.enemies=battle.enemies.filter(func(enemy):return enemy.lane==0)
  for enemy in battle.enemies: enemy.hp=8;enemy.max_hp=8
 elif node.id=="ashen":
  for enemy in battle.enemies:
   if enemy.lane==0: enemy.hp=10;enemy.max_hp=10
 elif node.id=="convoy" and battle.story.decisions.get("scout","")=="decoy":
  battle.gate=25;battle.story.initial_gate=25
  for enemy in battle.enemies:
   if enemy.lane==0:
    battle.story.formation.append({"id":enemy.id,"from":0,"to":1})
    enemy.lane=1
    break
 elif node.id=="frost" and battle.story.decisions.get("beacons","")=="ward":
  for member in battle.heroes: member.shield+=4
 elif node.id=="winter" and battle.story.decisions.get("citadel","")=="evacuate":
  battle.gate=20;battle.story.initial_gate=20
 elif node.id=="engine":
  for enemy in battle.enemies:
   if enemy.boss: enemy.name="Engine captain"
 plan()
 campaign.story.phase="battle";campaign.story.line=0
 message=node.care
 return true

func _story_battle() -> bool:
 return not battle.is_empty() and battle.has("story")

func encounter() -> Dictionary:
 var info=super.encounter().duplicate()
 if _story_battle():
  var node=StoryData.NODES[int(campaign.story.node)]
  info.name=node.title;info.desc=node.care
  if battle.story.node=="winter" and battle.story.decisions.get("citadel","")=="evacuate": info.rounds=4
 return info

func damage_against(actor: String,card: String,enemy: Dictionary) -> int:
 var amount=super.damage_against(actor,card,enemy)
 if _story_battle() and battle.story.node=="frost" and battle.story.decisions.get("beacons","")=="sunder" and enemy.boss: amount+=2
 return amount

func enemy_detail(enemy: Dictionary) -> String:
 var text=super.enemy_detail(enemy)
 if _story_battle() and battle.story.node=="convoy": text=text.replace("the gate","Ivo's cart")
 if _story_battle() and battle.story.node=="frost" and battle.story.decisions.get("beacons","")=="sunder" and enemy.boss: text+=" Merrin's tuning adds 2 damage to hits on the marshal."
 return text

func threat(enemy: Dictionary) -> String:
 var text=super.threat(enemy)
 return text.replace("Gate","Cart") if _story_battle() and battle.story.node=="convoy" and enemy.target=="gate" else text

func battle_brief() -> String:
 if _story_battle():
  var s=battle.story
  if s.node=="scout": return "Rescue Ivo: Rowan → front %d · %d turns left" % [3 if battle.quest.progress==0 else 1,6-battle.round]
  if s.node=="relic" and s.progress==1: return "Seal recovered: bring %s to front 1 and survive the turn." % ally(s.carrier).name
  if s.node=="engine":
   if s.progress==1: return "Chest collected: defeat every foe, then Rowan → front 1 and survive. %d turns left." % (10-battle.round)
   return "Rowan → front 2 to collect under fire. Clear every foe before extraction. %d turns left." % (10-battle.round)
  if s.node=="winter" and s.decisions.get("citadel","")=="evacuate": return "Evacuate: hold 4 turns; Rowan must survive on front 3. "+super.battle_brief()
 return super.battle_brief()

func before_enemy_turn():
 super.before_enemy_turn()
 if not _story_battle() or battle.phase!="playing": return
 var s=battle.story;s.pending=0
 if s.node=="relic" and s.progress==1:
  var carrier=ally(s.carrier)
  if carrier.hp>0 and carrier.lane==0: s.pending=1
 elif s.node=="engine":
  var clear=true
  for enemy in battle.enemies:
   if enemy.hp>0: clear=false
  if ally("rowan").hp>0 and ally("rowan").lane==(1 if s.progress==0 else 0) and (s.progress==0 or clear): s.pending=1

func _story_failure(text: String):
 battle.story_failure=text
 if battle.has("quest"): battle.quest_failure=text
 message=text
 settle(false)

func after_enemy_turn():
 if not _story_battle() or battle.story.node not in ["relic","engine"]:
  super.after_enemy_turn();return
 var s=battle.story;var q=battle.quest
 if s.node=="relic":
  if s.progress==0:
   var survivor=""
   for index in range(battle.heroes.size()):
    var h=battle.heroes[index]
    if q.pending & (1<<index) and h.hp>0: survivor=h.id;break
   if survivor!="":
    q.progress+=1
    if q.progress>=3: s.progress=1;s.carrier=survivor;log_event("The seal is recovered. %s must carry it to the High wall." % ally(s.carrier).name)
  elif ally(s.carrier).hp<=0:
   _story_failure("The seal carrier fell. Recover the seal on front 3 and escort its living carrier to front 1.");return
  elif s.pending==1: s.progress=2;settle(true);return
 else:
  if ally("rowan").hp<=0:
   _story_failure("Rowan fell before the chest reached the road. Collect it on front 2, then escort him to front 1 alive.");return
  if s.pending==1:
   s.progress+=1;s.carrier="rowan"
   if s.progress==2: settle(true);return
   log_event("Rowan has the chest. Escort him to the High wall.")
 s.pending=0;q.pending=0
 if battle.round>=encounter().rounds:
  _story_failure("Time ran out. "+("Recover the seal on front 3, then carry it to front 1 alive." if s.node=="relic" else "Break the engine, collect the chest on front 2, then escort Rowan to front 1 alive."))

func outcome():
 if _story_battle() and battle.story.node=="engine":
  var living=0
  for member in battle.heroes:
   if member.hp>0 and member.id!="ballista": living+=1
  if living==0 or battle.gate<=0: settle(false)
  return # Collection can happen under fire. Killing foes never extracts the chest.
 super.outcome()

func settle(won: bool):
 if battle.is_empty() or battle.rewarded: return
 if _story_battle():
  var s=battle.story
  if won and s.node in ["relic","engine"] and s.progress!=2: return
  if won and s.node=="winter" and s.decisions.get("citadel","")=="evacuate" and (ally("rowan").hp<=0 or ally("rowan").lane!=2):
   battle.story_failure="The evacuation was unfinished. Rowan must survive on front 3 when turn 4 ends."
   message=battle.story_failure;won=false
 super.settle(won)
 if _story_battle() and won:
  campaign.story.completed.append(battle.story.node)
  campaign.story.phase="outro";campaign.story.line=0

func settle_encounter(won: bool):
 if not _story_battle(): super.settle_encounter(won);return
 battle.phase="victory" if won else "defeat";battle.rewarded=true
 if not won:
  if not battle.has("story_failure"):
   if battle.has("quest_failure"): battle.story_failure=battle.quest_failure
   elif battle.gate<=0:
    battle.story_failure="The supply cart was lost. Missed escorts cost 5 gate health; keep Rowan with its next front." if battle.story.node=="convoy" else "The gate fell. Stop gate attackers and read the next bombardment before ending the turn."
   else: battle.story_failure="The company fell. Protect living heroes with block, healing and safer fronts, then try again."
  if battle.has("quest"): battle.quest_failure=battle.story_failure
  message=battle.story_failure
  log_event(battle.story_failure)
  return
 var node=story_node();var before=level()
 if node.kind=="main":
  var index=int(node.mission)
  battle.reward=SIEGES[index].gold
  campaign.wins[index]+=1
  campaign.unlocked=mini(5,maxi(int(campaign.unlocked),index+1))
 else:
  var quest=QUESTS[node.quest]
  battle.reward=quest.gold
  campaign.journey.completed.append(node.quest)
  if quest.relic!="": campaign.items[quest.relic]=0
  battle.quest_reward=("%s recovered and stored. Pack it at camp: %s" % [ITEMS[quest.relic].name,ITEMS[quest.relic].desc.to_lower()]) if quest.relic!="" else node.journal
 campaign.gold+=battle.reward
 campaign.xp=mini(350,int(campaign.xp)+int(node.xp))
 battle.new_level=level() if level()>before else 0
 if before<4 and level()>=4: campaign.items.frost=0
 if node.id=="relic":
  campaign.mage=true
  if not campaign.items.has("staff"): campaign.items.staff=0
 log_event("%s complete · +%d gold" % [node.title,battle.reward])

func return_to_camp() -> bool:
 if story_active() and campaign.story.phase=="outro": return fail("Hear the company before leaving this victory. Continue the story conversation.")
 var retry=_story_battle() and battle.phase=="defeat"
 if not super.return_to_camp(): return false
 if retry:
  campaign.story.phase="prepare";campaign.story.line=0
  message="Try %s again: repack if you like, then march." % story_node().title
 return true

func retreat():
 if _story_battle() and battle.phase=="playing": battle.story_failure="You withdrew. The company and its progress are safe; prepare and try this encounter again."
 super.retreat()

func restore(data) -> bool:
 if not super.restore(data): return false
 _creation_enrollment=false
 return true

func validate_save(data) -> String:
 var error=super.validate_save(data)
 if error!="": return error
 var b=data.battle
 if not data.campaign.has("story"):
  return "Missing authored story campaign." if b.has("story") else ""
 var s=data.campaign.story
 if not s is Dictionary or not integer_in(s.get("version"),STORY_VERSION,STORY_VERSION) or not integer_in(s.get("node"),0,StoryData.NODES.size()-1): return "Invalid authored story."
 if s.get("phase") not in STORY_PHASES or not s.get("completed") is Array or not s.get("decisions") is Dictionary: return "Invalid story progress."
 if s.phase!="complete" and data.campaign.pet!="wolf": return "The authored story requires Fen until the epilogue."
 if not data.campaign.has("opening"): return "Authored story requires its earned-rune opening."
 var complete_count=int(s.node)+(1 if s.phase in ["outro","ending","complete"] else 0)
 if s.completed.size()!=complete_count: return "Inconsistent story milestones."
 var expected_xp=0
 for index in range(s.completed.size()):
  if not s.completed[index] is String or s.completed[index]!=StoryData.NODES[index].id: return "Invalid completed story route."
  var node=StoryData.NODES[index];expected_xp+=int(node.xp)
  if node.kind=="main" and data.campaign.wins[node.mission]<1: return "Story requires its campaign victory."
  if node.kind=="quest" and node.quest not in data.campaign.get("journey",{}).get("completed",[]): return "Story requires its quest victory."
 if data.campaign.xp!=expected_xp: return "Invalid story level progression."
 if ("relic" in s.completed)!=data.campaign.mage or ("relic" in s.completed and not data.campaign.items.has("staff")): return "Invalid narrative recruitment."
 if "ashen" in s.completed and data.campaign.opening.stage!=3: return "Story requires its completed rune lesson."
 if "gate" not in s.completed and data.campaign.opening.stage!=0: return "Story opening precedes its first victory."
 if s.phase in ["ending","complete"] and s.node!=StoryData.NODES.size()-1: return "Story ending requires the recovered chest."
 for id in s.decisions:
  if not id is String: return "Invalid story decision identity."
  var found=false
  for index in range(StoryData.NODES.size()):
   var node=StoryData.NODES[index]
   if node.id!=id: continue
   if index>int(s.node) or (index==int(s.node) and s.phase!="outro"): return "Story decision precedes its encounter."
   for option in node.choices:
    if s.decisions[id] is String and s.decisions[id]==option.id: found=true
  if not found: return "Invalid story decision."
 for pair in [["scout",2],["beacons",6],["citadel",8]]:
  if int(s.node)>pair[1] and not s.decisions.has(pair[0]): return "Missing earlier story decision."
 var lines=[]
 if s.phase=="ending": lines=StoryData.ending_lines(s.decisions)
 elif s.phase in ["intro","outro"]: lines=StoryData.NODES[int(s.node)][s.phase]
 if not integer_in(s.get("line"),0,maxi(0,lines.size()-1)): return "Invalid story scene cursor."
 if s.phase=="battle" and (b.is_empty() or not b.has("story")): return "Missing active story encounter."
 if s.phase=="outro" and (b.is_empty() or not b.has("story")): return "Missing story victory and its rewards."
 if not b.has("story"):
  if not b.is_empty() and s.phase!="complete": return "Off-route battle in authored story."
  return ""
 var bs=b.story;var node=StoryData.NODES[int(s.node)]
 if not bs is Dictionary or not integer_in(bs.get("version"),STORY_VERSION,STORY_VERSION) or not bs.get("node") is String or bs.node!=node.id: return "Invalid story battle."
 if s.phase not in ["battle","outro"] or (s.phase=="outro" and b.phase!="victory") or (s.phase=="battle" and b.phase=="victory"): return "Inconsistent story battle phase."
 for flag in ["war_rules","mastery_rules","journey_rules"]:
  if not b.get(flag) is bool or not b[flag]: return "Missing authored battle rules."
 if b.has("contract") or (node.kind=="main" and (b.has("quest") or b.mission!=node.mission)) or (node.kind=="quest" and b.get("quest",{}).get("id","")!=node.quest): return "Off-route story encounter."
 var battle_decisions=s.decisions.duplicate(true)
 if s.phase=="outro": battle_decisions.erase(node.id)
 if not bs.get("decisions") is Dictionary or bs.decisions!=battle_decisions: return "Invalid story battle decisions."
 if not integer_in(bs.get("progress"),0,2) or not integer_in(bs.get("pending"),0,1) or not bs.get("carrier") is String: return "Invalid story objective."
 if not integer_in(bs.get("initial_gate"),20,30) or b.gate>bs.initial_gate: return "Invalid story durability."
 var expected_gate=25 if node.id=="convoy" and s.decisions.get("scout","")=="decoy" else (20 if node.id=="winter" and s.decisions.get("citadel","")=="evacuate" else 30)
 if bs.initial_gate!=expected_gate: return "Story durability disagrees with its choice."
 if not bs.get("formation") is Array or bs.formation.size()>(1 if node.id=="convoy" and expected_gate==25 else 0): return "Invalid decoy formation."
 if node.id=="convoy" and expected_gate==25 and bs.formation.size()!=1: return "Missing decoy formation."
 for move in bs.formation:
  if not move is Dictionary or not move.get("id") is String or not integer_in(move.get("from"),0,0) or not integer_in(move.get("to"),1,1): return "Invalid decoy maneuver."
  var found=false
  for enemy in b.enemies:
   if enemy.id==move.id and enemy.lane==1: found=true
  if not found: return "Missing decoy enemy."
 if node.id not in ["relic","engine"] and (bs.progress!=0 or bs.pending!=0 or bs.carrier!=""): return "Unexpected story extraction."
 if node.id=="winter" and bs.decisions.get("citadel","")=="evacuate" and b.phase=="victory":
  var escort={}
  for member in b.heroes:
   if member.id=="rowan": escort=member
  if escort.is_empty() or escort.hp<=0 or escort.lane!=2: return "Evacuation requires living Rowan on the Lower gate."
 if node.id in ["relic","engine"]:
  if bs.progress==2 and b.phase!="victory": return "Completed story extraction requires victory."
  if bs.progress==0 and bs.carrier!="": return "Premature story carrier."
  if bs.progress>0:
   var found=false
   var carrier={}
   for member in b.heroes:
    if member.id==bs.carrier: found=true;carrier=member
   if not found or (node.id=="engine" and bs.carrier!="rowan"): return "Unknown story carrier."
   if b.phase=="victory" and (carrier.hp<=0 or carrier.lane!=0): return "Story extraction requires a living carrier at the High wall."
  if node.id=="relic" and ((bs.progress==0 and b.quest.progress>=3) or (bs.progress>0 and b.quest.progress!=3)): return "Inconsistent seal recovery."
  if b.phase=="victory" and bs.progress!=2: return "Story extraction requires the living carrier."
  if node.id=="engine" and b.phase=="victory":
   for enemy in b.enemies:
    if enemy.hp>0: return "Story extraction requires a cleared escape route."
 if b.has("story_failure") and (b.phase!="defeat" or not b.story_failure is String or b.story_failure.length()>240): return "Invalid story failure."
 return ""
