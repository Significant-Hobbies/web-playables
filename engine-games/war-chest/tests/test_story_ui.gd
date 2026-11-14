extends SceneTree
## Native Main wiring tests. Late-route state is an explicit UI fixture, not earned proof.
const Main=preload("res://scripts/pocket_main.gd")
const StoryGame=preload("res://scripts/story_game.gd")
var checks=0
var failures=0

func _init():call_deferred("run")
func check(ok: bool,message: String):
 checks+=1
 if not ok:failures+=1;push_error("FAIL: "+message)
func control(screen,key: String):
 for child in screen.hud.get_children():
  if child is Button and (child.get_meta("focus_key",child.text)==key or child.text==key):return child
 return null
func press(screen,key: String):
 var button=control(screen,key)
 check(button!=null and not button.disabled,"Story action available: "+key)
 if button!=null and not button.disabled:button.grab_focus();button.pressed.emit();return true
 return false
func press_prefix(screen,label: String):
 for child in screen.hud.get_children():
  if child is Button and child.text.begins_with(label):return press(screen,child.text)
 check(false,"Story action with named label available: "+label);return false
func focus_key(screen) -> String:
 var focused=screen.get_viewport().gui_get_focus_owner()
 return str(focused.get_meta("focus_key",focused.text)) if focused is Button else ""
func contains_text(screen,fragment: String) -> bool:
 for child in screen.hud.get_children():
  if child is Label and child.text.contains(fragment):return true
 return false
func fixture(index: int,decisions: Dictionary):
 var game=StoryGame.new();game.enroll_story()
 game.campaign.story.node=index;game.campaign.story.phase="prepare"
 game.campaign.story.decisions=decisions.duplicate(true)
 for previous in range(index):
  var node=StoryGame.StoryData.NODES[previous]
  game.campaign.story.completed.append(node.id);game.campaign.xp+=node.xp
  if node.kind=="main":
   game.campaign.wins[node.mission]+=1;game.campaign.unlocked=mini(5,node.mission+1)
  else:
   game.campaign.journey.completed.append(node.quest)
   var relic=game.QUESTS[node.quest].relic
   if relic!="":game.campaign.items[relic]=0
  if node.id=="relic":game.campaign.mage=true;game.campaign.items.staff=0
 if index>0:
  game.campaign.opening.stage=3 if index>1 else 1
  game.campaign.opening.rune_used=index>1;game.campaign.items.cube=0
 if game.level()>=4:game.campaign.items.frost=0
 check(game.validate_save(game.snapshot())=="","Injected story UI fixture satisfies the save schema")
 return game
func install(screen,game,page: String):
 screen.cancel_combat_animation();screen.game=game;screen.field.game=game
 screen.page=page;screen.chosen="";screen.target="";screen.battle_notice="";screen.mastery_notice=""
 screen.show_page()
func escape(screen):
 var event=InputEventKey.new();event.keycode=KEY_ESCAPE;event.pressed=true;screen._input(event)

func key(screen,code: int):
 var event=InputEventKey.new();event.keycode=code;event.pressed=true;screen._input(event)

func select_freely(screen,id: String,code: int=0):
 var before=screen.game.snapshot()
 press(screen,"hero_rowan")
 press(screen,"command_strike");key(screen,KEY_T)
 check(screen.chosen=="strike" and screen.target!="","Selection contrast starts with a real command and legal target preview")
 if code==0:press(screen,"hero_"+id)
 else:key(screen,code)
 check(screen.selected==id and screen.field.selected==id and screen.chosen=="" and screen.target=="","Actual portrait/key switch selects the companion and clears both command and target: "+id)
 check(screen.game.snapshot()==before,"Selecting a companion changes no orders, health, usage, position or campaign state: "+id)
 for card in screen.game.cards(id):
  check(control(screen,"command_"+card)!=null,"Selection presents the actual companion's command: "+id+"/"+card)

func pack_item(screen,id: String,point: Vector2i):
 press(screen,"Pack equipment");press_prefix(screen,StoryGame.ITEMS[id].name)
 for step in range(5):key(screen,KEY_A)
 for step in range(4):key(screen,KEY_W)
 for step in range(point.x):key(screen,KEY_D)
 for step in range(point.y):key(screen,KEY_S)
 key(screen,KEY_F)
 check(screen.game.campaign.placements.has(id) and screen.game.campaign.placements[id].slice(0,2)==[point.x,point.y],"Actual item selection and chest keyboard callback pack the stored equipment: "+id)
 press(screen,"← Company road")

func attack(screen,id: String,card: String) -> bool:
 var game=screen.game;var target={}
 for enemy in game.battle.enemies:
  if game.reason(id,card,enemy.id)=="" and (target.is_empty() or enemy.hp<target.hp):target=enemy
 check(not target.is_empty(),"A real legal target exists for the UI command: "+card)
 if target.is_empty():return false
 var orders=game.battle.commands;var hp=target.hp;var enemy_id=target.id
 press(screen,"hero_"+id);press(screen,"command_"+card);press(screen,"actor_"+enemy_id)
 check(game.battle.commands==orders-StoryGame.COMMANDS[card].cost and game.ally(id).used.has(card),"Actual target callback spends the advertised shared orders once: "+card)
 check(game.foe(enemy_id).hp<hp,"Actual UI command damages its living target: "+card)
 if card in ["spark","pin","frost"]:
  check(game.foe(enemy_id).hp<=0 or game.foe(enemy_id).stunned,"Actual UI command cancels the surviving foe's next attack: "+card)
 return true

func retry(screen):
 press(screen,"Menu");press(screen,"Retreat to keep");press(screen,"Withdraw — keep gear, forfeit reward?")
 press(screen,"Prepare another attempt →")

func joining_and_levels(screen):
 # This validated UI fixture starts before the Reliquary. Recovery and extraction
 # below use legal live turns; no mage flag, objective progress or reward is injected.
 var relic=fixture(5,{"scout":"reinforce"})
 install(screen,relic,"keep")
 check(not relic.campaign.mage and not relic.campaign.items.has("staff"),"Merrin and his staff are absent before recovery")
 var gold=relic.campaign.gold
 press(screen,"story_march")
 press(screen,"hero_rowan");press(screen,"command_move");press(screen,"Front 3")
 for turn in range(3):
  press(screen,"hero_rowan");press(screen,"command_guard")
  press(screen,"hero_rowan");press(screen,"command_ward");press(screen,"actor_lysa")
  attack(screen,"lysa","volley")
  if relic.reason("rowan","cleave")=="" and relic.battle.enemies.any(func(e):return relic.reason("rowan","cleave",e.id)==""):attack(screen,"rowan","cleave")
  press(screen,"end_turn")
  check(relic.battle.phase=="playing" and relic.battle.quest.progress==turn+1,"Actual shielded survival earns the next recovery charge")
 check(relic.battle.story.progress==1 and relic.battle.story.carrier=="rowan","Three actual survival turns assign their living carrier")
 press(screen,"hero_rowan");press(screen,"command_move");press(screen,"Front 1")
 press(screen,"hero_rowan");press(screen,"command_guard")
 press(screen,"hero_rowan");press(screen,"command_ward");press(screen,"actor_lysa")
 press(screen,"end_turn")
 check(relic.battle.phase=="victory" and relic.battle.story.progress==2 and relic.ally("rowan").hp>0,"Actual live carrier extraction earns the Reliquary victory")
 check(relic.campaign.mage and relic.campaign.items.has("staff") and not relic.campaign.placements.has("staff"),"Victory automatically joins Merrin with an owned, stored staff")
 check(relic.campaign.gold==gold+relic.battle.reward,"Automatic join charges no recruitment fee against the actual victory reward")
 check(contains_text(screen,"Merrin joins free") and contains_text(screen,"Select him with 4") and contains_text(screen,"staff for Storm"),"Reliquary reward explains free join, selection and the stored command requirement")
 var copy=StoryGame.new()
 check(copy.restore(relic.snapshot()),"Actually recovered company and stored staff restore as a valid save")
 if relic.has_loot():press(screen,"story_banner_"+relic.battle.loot[0])
 press(screen,"story_reward_continue")
 for step in range(8):
  if relic.campaign.story.phase not in ["intro","outro"]:break
  press(screen,"story_continue")
 check(relic.story_node().id=="beacons" and relic.campaign.story.phase=="prepare","Actual aftermath opens Merrin's first deployment")
 press(screen,"story_march")
 check(relic.battle.heroes.size()==4 and relic.ally("merrin").hp>0,"Joined Merrin really deploys as the fourth living companion")
 select_freely(screen,"merrin",KEY_4)
 press(screen,"hero_merrin")
 check(not relic.cards("merrin").has("spark") and control(screen,"command_spark")==null and contains_text(screen,"His staff is stored"),"Stored staff gives usable basic commands while Storm remains absent")
 var orders=relic.battle.commands
 press(screen,"command_guard")
 check(relic.battle.commands==orders-1 and relic.ally("merrin").shield>=6,"Unpacked Merrin can execute his actual basic Guard")
 check(control(screen,"command_guard").disabled and not control(screen,"command_strike").disabled,"A used Guard is unavailable this turn while another Merrin command remains legal")
 retry(screen)
 pack_item(screen,"staff",Vector2i(4,2));press(screen,"story_march")
 key(screen,KEY_4)
 check(relic.cards("merrin").has("spark") and control(screen,"command_spark")!=null,"The packed staff adds Storm to actual deployed Merrin")
 attack(screen,"merrin","spark")
 # Later UI fixtures are explicitly validated route states. Commands and order
 # budgets are tested through live callbacks rather than simulated capability flags.
 var level3=fixture(6,{"scout":"reinforce"});check(level3.begin_story_node(),"Level-three health comparison starts an actual deployment")
 var level4=fixture(7,{"scout":"reinforce","beacons":"ward"})
 install(screen,level4,"keep")
 check(contains_text(screen,"Company level 4/6") and contains_text(screen,"The Iron Oath → level 5"),"Road names its actual current level and next XP milestone")
 press(screen,"story_march")
 check(level4.battle.commands==6 and contains_text(screen,"6 orders") and level4.cards("fen").has("pin") and not level4.cards("rowan").has("rally"),"Level four deploys automatic Pin with six visible orders before Rally unlocks")
 for hero in level4.battle.heroes:check(hero.max_hp==level3.ally(hero.id).max_hp+2,"Actual new-level deployment grants two max HP to every companion: "+hero.id)
 check(level4.campaign.items.has("frost") and not level4.cards("lysa").has("frost") and not level4.campaign.placements.has("frost"),"Free Frostfang is owned in storage and gives no unpacked Freeze")
 attack(screen,"fen","pin")
 retry(screen);pack_item(screen,"frost",Vector2i(2,3));press(screen,"story_march")
 check(level4.cards("lysa").has("frost"),"Actual Frostfang packing gives Lysa Freeze")
 attack(screen,"lysa","frost")
 var level5=fixture(9,{"scout":"reinforce","beacons":"ward","citadel":"hold"})
 install(screen,level5,"keep");press(screen,"story_march")
 check(level5.battle.commands==7 and contains_text(screen,"7 orders") and level5.cards("rowan").has("rally") and level5.cards("fen").has("pin"),"Level five deploys seven visible shared orders with automatic Rally and retained Pin")
 var shields={}
 for hero in level5.battle.heroes:shields[hero.id]=hero.shield
 press(screen,"hero_rowan");press(screen,"command_rally")
 check(level5.battle.commands==6 and level5.ally("rowan").used.has("rally"),"Rally spends one real shared order and is used once this turn")
 check(control(screen,"command_rally").disabled and not control(screen,"command_strike").disabled,"Automatic Rally follows the same once-per-command rule without ending all Rowan's orders")
 for hero in level5.battle.heroes:check(hero.shield==shields[hero.id]+4,"Actual Rally protects every living companion without required equipment: "+hero.id)

func run():
 if "--story-demo" not in OS.get_cmdline_user_args():
  push_error("Story UI tests require --story-demo to isolate saves.");quit(1);return
 var screen=Main.new();root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 await process_frame
 check(screen.demo and screen.page=="story" and screen.game.story_active(),"Fresh isolated Main opens the actual story scene")
 check(screen.game.story_line().speaker=="Lysa" and contains_text(screen,"LYSA") and contains_text(screen,"families below the causeway"),"Opening shows the authored speaker and human stakes")
 var snapshot=screen.game.snapshot()
 press(screen,"Menu")
 check(screen.page=="guide" and screen.guide_return=="story","Story Menu records its return surface")
 for section in ["Select & command","Joining the company","Company levels","Pack & mastery"]:
  check(contains_text(screen,section),"Actual story guide exposes its onboarding section: "+section)
 escape(screen)
 check(screen.page=="story" and screen.game.snapshot()==snapshot,"Escape returns to the exact unread story line")
 for line in range(3):
  press(screen,"story_continue")
  if line<2:
   check(screen.page=="story" and screen.game.campaign.story.line==line+1,"Continue advances exactly one authored line")
   check(focus_key(screen)=="story_continue","Continue retains native keyboard focus")
 check(screen.page=="keep" and screen.game.campaign.story.phase=="prepare","Last intro line opens actual preparation")
 check(contains_text(screen,"Company level 1/6") and contains_text(screen,"The Lantern Gate → level 2"),"Fresh road names the actual first XP milestone")
 check(focus_key(screen)=="story_march","Dialogue-to-preparation transfers focus to the next story action")
 check(contains_text(screen,"The Lantern Gate") and contains_text(screen,"Get the families through"),"Preparation retains its named current task")
 press(screen,"Pack equipment")
 check(screen.page=="chest" and screen.game.campaign.story.phase=="prepare","Story preparation opens the actual spatial chest")
 press(screen,"← Company road")
 check(screen.page=="keep","Chest returns to the same story preparation")
 press(screen,"story_march")
 check(screen.page=="battle" and screen.game.battle.has("story") and screen.game.battle.story.node=="gate","March starts the real current encounter")
 var initial_health={}
 for hero in screen.game.battle.heroes:initial_health[hero.id]=hero.max_hp
 for profile in [["rowan","Melee",1],["lysa","Ranged",2],["fen","Wolf",3]]:
  var portrait=control(screen,"hero_"+profile[0])
  check(portrait!=null and portrait.tooltip_text.contains(profile[1]) and portrait.tooltip_text.contains("[%d]" % profile[2]),"Actual portrait teaches the companion's role and selection key: "+profile[0])
  check(screen.actor_detail(screen.game.ally(profile[0]),false).contains(profile[1]),"Actual troop detail identifies the same role: "+profile[0])
 select_freely(screen,"lysa")
 select_freely(screen,"fen",KEY_3)
 select_freely(screen,"rowan",KEY_1)
 press(screen,"hero_rowan")
 check(contains_text(screen,"Rowan is selected") and contains_text(screen,"switch freely"),"First command lesson explains the actual selected companion and free switches")
 attack(screen,"rowan","cleave")
 press(screen,"hero_lysa")
 check(contains_text(screen,"Lysa's cards are now shown") and control(screen,"command_volley")!=null,"After an actual attack, the ranged lesson describes Lysa's selected command cards")
 var story_progress=screen.game.campaign.story.duplicate(true)
 screen.game.retreat();screen.show_page()
 check(contains_text(screen,"The company withdrew") and contains_text(screen,"Your companions, equipment and gold are kept."),"Defeat explains preservation and the remaining human task")
 press(screen,"Prepare another attempt →")
 check(screen.page=="keep" and screen.game.battle.is_empty() and screen.game.campaign.story.node==story_progress.node and screen.game.campaign.story.phase=="prepare","Defeat retry returns to the same encounter without advancing milestones")
 check(screen.game.campaign.story.completed==story_progress.completed,"Retry preserves earned story progress")
 check(focus_key(screen)=="story_march","Defeat retry transfers keyboard focus to preparation")
 press(screen,"story_march")
 # UI-only Gate settlement verifies reward-to-rune wiring, not earned combat.
 screen.game.settle(true);screen.show_page()
 check(contains_text(screen,"Storm rune recovered") and not screen.game.campaign.placements.has("cube"),"Gate reward explains the newly earned unpacked rune")
 check(screen.game.level()==2 and screen.game.forge_limit()==1 and contains_text(screen,"free lasting talent") and contains_text(screen,"Forge +1 is open"),"Gate reward discloses the real newly available talent and forge rank")
 check(not screen.game.campaign.mage and contains_text(screen,"Merrin joins later") and not contains_text(screen,"recruit for 60"),"Story level-two reward preserves the later automatic join instead of promising paid recruitment")
 press(screen,"story_reward_continue")
 for step in range(8):
  if screen.game.campaign.story.phase!="outro":break
  if not press(screen,"story_continue"):break
 for step in range(8):
  if screen.game.campaign.story.phase!="intro":break
  if not press(screen,"story_continue"):break
 check(screen.page=="chest" and screen.gear=="cube" and screen.game.story_node().id=="ashen","Gate aftermath and Ashen briefing lead to actual rune preparation")
 var rune_march=control(screen,"Pack a rune beside a weapon")
 check(rune_march!=null and rune_march.disabled,"Ashen departure is visibly blocked until the earned rune is linked")
 var pack=InputEventKey.new();pack.keycode=KEY_F;pack.pressed=true;screen._input(pack)
 check(screen.game.empowered("blade") or screen.game.empowered("bow"),"Actual chest keyboard callback links the earned rune beside a weapon")
 press(screen,"← Company road")
 check(contains_text(screen,"Company level 2/6") and contains_text(screen,"The Last Supply Cart → level 3"),"Road advances its named XP milestone after the real Gate level-up")
 press(screen,"The quartermaster")
 var company_gold=screen.game.campaign.gold
 press(screen,"Battlecraft · +1 damage")
 check(screen.game.campaign.talent=="might" and screen.game.campaign.gold==company_gold,"Quartermaster callback grants the advertised permanent talent for free")
 press(screen,"+0 · Upgrade 30 gold")
 check(screen.game.campaign.items.blade==1 and screen.game.campaign.gold==company_gold-30,"Actual forge callback uses company gold to unlock rank-one blade damage")
 var recruit=control(screen,"Joins after the Sunken Reliquary")
 check(recruit!=null and recruit.disabled and not screen.game.campaign.mage,"Story quartermaster keeps premature Merrin recruitment unavailable")
 press(screen,"← Company road")
 press(screen,"story_march")
 check(screen.page=="battle" and screen.game.battle.story.node=="ashen","Linked-rune preparation callback starts the real Ashen encounter")
 check(screen.game.ally("rowan").power==7,"Chosen free Battlecraft talent applies its actual damage to next deployment")
 for hero in screen.game.battle.heroes:check(hero.max_hp==initial_health[hero.id]+2,"The actual Gate level-up grants two starting max HP: "+hero.id)
 # Isolated post-rescue UI fixture: canonical model settlement, not earned battle proof.
 var rescue=fixture(2,{})
 check(rescue.begin_story_node(),"Scout UI fixture begins its modeled encounter")
 rescue.battle.quest.progress=2;rescue.settle(true)
 install(screen,rescue,"battle")
 var continue_reward=control(screen,"story_reward_continue")
 check(rescue.has_loot() and continue_reward!=null and continue_reward.disabled,"Story reward cannot skip a pending banner")
 var banner=rescue.battle.loot[0]
 press_prefix(screen,screen.Game.BANNERS[banner].name)
 check(not rescue.has_loot() and not control(screen,"story_reward_continue").disabled,"Actual reward callback claims the offered banner and enables dialogue")
 press(screen,"story_reward_continue")
 check(screen.page=="story" and rescue.campaign.story.phase=="outro","Reward callback opens the actual rescue aftermath")
 for step in range(8):
  if rescue.campaign.story.line>=rescue.story_lines().size()-1:break
  if not press(screen,"story_continue"):break
 var choices=rescue.story_options()
 check(choices.size()==2 and contains_text(screen,"They took the wages"),"Ivo's final speech accompanies the two canonical choices")
 for option in choices:
  var button=control(screen,"story_choice_"+option.id)
  check(button!=null and button.text==option.label and button.accessibility_description==option.consequence and contains_text(screen,option.consequence),"Story choice exposes its exact visible and accessible consequence: "+option.id)
 rescue.save_error="Save could not be written. Move the damaged file aside before relaunching."
 screen.show_page()
 var warning=null
 for child in screen.hud.get_children():
  if child is Label and child.text.begins_with("SAVING DISABLED"):warning=child
 check(warning!=null,"Story save failure has a visible warning")
 if warning!=null:
  for child in screen.hud.get_children():
   if child is Button:check(not warning.get_rect().intersects(child.get_rect()),"Story save failure keeps every action uncovered")
   if child is Label and choices.any(func(option):return option.consequence==child.text):
    check(not warning.get_rect().intersects(child.get_rect()),"Story save failure keeps the full choice consequence uncovered")
 press(screen,"Menu")
 check(screen.page=="guide" and contains_text(screen,rescue.save_error),"Story Menu retains complete save recovery information")
 escape(screen);rescue.save_error="";screen.show_page()
 snapshot=rescue.snapshot();screen.story_choose("not-offered")
 check(rescue.snapshot()==snapshot and screen.page=="story" and contains_text(screen,rescue.message),"Invalid story choice is atomic and explains why it failed")
 press(screen,"story_choice_decoy")
 check(rescue.campaign.story.decisions.scout=="decoy" and rescue.story_node().id=="convoy" and screen.page=="story" and rescue.campaign.story.line==0,"Actual decoy callback records one decision and opens the next encounter's first line")
 check(focus_key(screen)=="story_continue","Choice transfers keyboard focus to the next conversation")
 for step in range(8):
  if rescue.campaign.story.phase!="intro":break
  if not press(screen,"story_continue"):break
 snapshot=rescue.snapshot()
 press(screen,"Promises & decisions")
 check(screen.page=="journal" and contains_text(screen,choices[1].label),"Company journal recalls the actual decoy decision")
 press(screen,"← Company road")
 check(screen.page=="keep" and rescue.snapshot()==snapshot,"Journal returns to exact current preparation without changing story state")
 press(screen,"Company banner")
 check(screen.page=="story_banners" and contains_text(screen,"Equip one earned banner"),"Company road exposes earned-banner equipment before marching")
 press_prefix(screen,screen.Game.BANNERS[banner].name)
 check(rescue.war().equipped==banner,"Actual story banner callback equips the previously earned banner")
 press(screen,"← Company road")
 check(screen.page=="keep" and rescue.campaign.story.phase=="prepare","Banner page returns to the current story preparation")
 press(screen,"story_march")
 check(rescue.battle.gate==25 and rescue.battle.story.formation.size()==1 and rescue.war().equipped==banner,"Selected UI choice changes the real convoy and retains the equipped earned banner")
 joining_and_levels(screen)
 # Epilogue UI fixture with known branch choices; full earned route is tested elsewhere.
 var ending=fixture(11,{"scout":"decoy","beacons":"sunder","citadel":"evacuate"})
 ending.begin_story_node();ending.battle.story.progress=2;ending.battle.story.carrier="rowan";ending.settle(true)
 if ending.has_loot():ending.claim_banner(ending.battle.loot[0])
 ending.campaign.story.line=ending.story_lines().size()-1;ending.advance_story()
 check(ending.validate_save(ending.snapshot())=="","Canonical epilogue UI fixture validates")
 install(screen,ending,"story")
 ending.campaign.story.line=4;screen.show_page()
 check(contains_text(screen,"Winterwatch is gone") and contains_text(screen,"HOME"),"Actual ending recalls the evacuation choice in its home scene")
 for step in range(8):
  if ending.campaign.story.phase!="ending":break
  if not press(screen,"story_continue"):break
 check(ending.campaign.story.phase=="complete" and screen.page=="keep" and not ending.story_active(),"Last ending callback unlocks actual free exploration")
 press(screen,"War contracts")
 check(screen.keep_mode=="contracts","Completed story exposes the existing company's free-play capabilities")
 press(screen,"Take contract  →")
 check(screen.page=="battle" and ending.battle.has("contract") and not ending.battle.has("story"),"Free-play contract callback starts a real battle after the epilogue")
 screen.queue_free();await process_frame;await process_frame
 print("STORY UI TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
