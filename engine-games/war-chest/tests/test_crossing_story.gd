extends SceneTree
## Selected story controls and legal reward-to-packing flow. All storage is demo-only.
const Main=preload("res://scripts/pocket_main.gd")
const Story=preload("res://scripts/pocket_story.gd")
const Game=preload("res://scripts/story_game.gd")
var checks=0
var failures=0

func _init(): call_deferred("run")
func check(ok: bool,why: String):
 checks+=1
 if not ok: failures+=1;push_error("FAIL: "+why)
func control(s,key: String):
 for child in s.hud.get_children():
  if child is Button and (child.get_meta("focus_key",child.text)==key or child.text==key): return child
 return null
func press(s,key: String):
 var button=control(s,key)
 check(button!=null and not button.disabled,"Real story control is available: "+key)
 if button!=null and not button.disabled: button.grab_focus();button.pressed.emit()
func text_present(s,fragment: String) -> bool:
 for child in s.hud.get_children():
  if child is Label and child.text.contains(fragment): return true
 return false
func preview(s):
 for child in s.hud.get_children():
  if child.get_meta("story_chest_preview",false): return child
 return null
func key(s,code: int):
 var event=InputEventKey.new();event.keycode=code;event.pressed=true;s._input(event)
func install(s,game,page: String):
 s.cancel_combat_animation();s.game=game;s.field.game=game;s.page=page
 s.chosen="";s.target="";s.battle_notice="";s.mastery_notice="";s.show_page()
func attack_if_legal(game,id: String,card: String) -> bool:
 if game.reason(id,card)!="": return false
 var target={}
 for enemy in game.battle.enemies:
  if game.reason(id,card,enemy.id)=="" and (target.is_empty() or enemy.hp<target.hp): target=enemy
 return not target.is_empty() and game.play(id,card,target.id)
func earned_gate(s):
 press(s,"story_march")
 var game=s.game
 for turn in range(4):
  if game.battle.phase!="playing": break
  attack_if_legal(game,"rowan","cleave")
  attack_if_legal(game,"lysa","volley")
  for id in ["fen","rowan","lysa"]: attack_if_legal(game,id,"strike")
  if game.reason("rowan","ward","rowan")=="": game.play("rowan","ward","rowan")
  for hero in game.battle.heroes:
   if game.reason(hero.id,"guard")=="": game.play(hero.id,"guard","")
  game.resolve()
 s.show_page()
 check(game.battle.phase=="victory" and game.campaign.story.phase=="outro","Four actual legal enemy phases earn the Gate aftermath")

func route_fixture(index: int,decisions: Dictionary):
 # Validated pre-archive UI fixture; recruitment itself is earned below through
 # recovery/extraction actions. This is not proof of earning the preceding route.
 var game=Game.new();game.enroll_story()
 game.campaign.story.node=index;game.campaign.story.phase="prepare"
 game.campaign.story.decisions=decisions.duplicate(true)
 for previous in range(index):
  var node=Game.StoryData.NODES[previous]
  game.campaign.story.completed.append(node.id);game.campaign.xp+=node.xp
  if node.kind=="main":
   game.campaign.wins[node.mission]+=1;game.campaign.unlocked=mini(5,node.mission+1)
  else:
   game.campaign.journey.completed.append(node.quest)
   var relic=game.QUESTS[node.quest].relic
   if relic!="": game.campaign.items[relic]=0
  if node.id=="relic": game.campaign.mage=true;game.campaign.items.staff=0
 if index>0:
  game.campaign.opening.stage=3 if index>1 else 1;game.campaign.opening.rune_used=index>1;game.campaign.items.cube=0
  game.place("cube",1,0,0)
 if game.level()>=4: game.campaign.items.frost=0
 check(game.validate_save(game.snapshot())=="","Declared route UI fixture satisfies the real save schema")
 return game

func recruitment(s):
 var game=route_fixture(5,{"scout":"reinforce"});install(s,game,"keep")
 check(not game.campaign.mage and not game.campaign.items.has("staff"),"Merrin and his staff are absent before recovery")
 press(s,"The quartermaster")
 var recruitment_control=control(s,"Joins after the Sunken Reliquary")
 check(recruitment_control!=null and recruitment_control.disabled,"Camp merchant retains the authored free-recruitment lock")
 press(s,"← Company road");press(s,"story_march")
 var before=game.campaign.gold
 check(game.reposition("rowan",2),"The real carrier moves to the archive")
 for turn in range(3):
  check(game.play("rowan","guard",""),"The carrier receives real protection for recovery")
  check(game.play("rowan","ward","lysa"),"The archer receives real protection during recovery")
  attack_if_legal(game,"lysa","volley");attack_if_legal(game,"rowan","cleave")
  game.resolve()
 check(game.battle.story.progress==1,"Three protected survival turns earn the recovered seal")
 check(game.reposition("rowan",0),"The living carrier returns to the actual exit")
 game.play("rowan","guard","");game.play("rowan","ward","lysa");game.resolve();s.show_page()
 await process_frame;label_layout(s,"recruitment/reward")
 check(game.battle.phase=="victory" and game.campaign.mage,"A real extraction automatically earns Merrin")
 check(game.campaign.gold==before+game.battle.reward,"Automatic joining spends no recruitment fee")
 check(game.campaign.items.has("staff") and not game.campaign.placements.has("staff"),"The newly owned staff remains stored")
 check(text_present(s,"Merrin joins free") and text_present(s,"Select him with 4") and text_present(s,"staff for Storm"),"The actual reward explains free arrival, selection and required packing")
 var staged=false
 for child in s.hud.get_children():
  if child.get_meta("story_companion","")=="merrin": staged=true
 check(staged,"The newly joined companion is visibly staged in the reward world")
 if game.has_loot():
  check(control(s,"story_reward_continue").disabled,"Pending banners still prevent skipping the aftermath")
  press(s,"story_banner_"+game.battle.loot[0])
 press(s,"story_reward_continue")
 for step in range(8):
  if game.campaign.story.phase not in ["outro","intro"]: break
  press(s,"story_continue")
 check(game.story_node().id=="beacons" and game.campaign.story.phase=="prepare","All authored archive and watchfire dialogue leads to preparation")
 check(text_present(s,"Merrin now deploys too. Pack his staff for Storm."),"Camp identifies the new companion's immediate preparation")
 var snapshot=game.snapshot();press(s,"Pack equipment")
 check(s.page=="chest" and s.gear=="staff" and game.snapshot()==snapshot,"The real camp CTA preselects the stored staff without changing progress or packing it")
 for step in range(3): key(s,KEY_D)
 for step in range(2): key(s,KEY_S)
 key(s,KEY_F)
 check(game.campaign.placements.get("staff",[]).slice(0,2)==[4,2],"The actual chest input packs Merrin's staff")
 press(s,"← Company road");press(s,"story_march")
 check(game.battle.heroes.size()==4 and game.cards("merrin").has("spark"),"Packed preparation really deploys the fourth companion with Storm")

func label_layout(s,case_name: String):
 # Font metrics come from Godot's actual configured desktop fonts. They detect
 # overflow; they do not establish visual quality or replace a native capture.
 var overflow=[];var outside=[];var covered=[];var button_width=[]
 for child in s.hud.get_children():
  if child is Label and child.has_meta("layout_rect"):
   var frame: Rect2=child.get_meta("layout_rect")
   var minimum=child.get_minimum_size()
   if minimum.y>frame.size.y+1: overflow.append("%s (%s needs %s)" % [child.text.left(55),frame.size.y,minimum.y])
   if not Rect2(0,0,1440,900).encloses(child.get_rect()): outside.append(child.text.left(55))
   var content=Rect2(child.position,Vector2(child.size.x,minimum.y))
   for action in s.hud.get_children():
    if action is Button and child.get_meta("label_for",0)!=action.get_instance_id():
     if content.intersects(action.get_rect()): covered.append(child.text.left(45)+" / "+action.text)
  elif child is Button:
   var font=child.get_theme_font("font");var point=child.get_theme_font_size("font_size")
   for line in child.text.split("\n"):
    if font.get_string_size(line,HORIZONTAL_ALIGNMENT_LEFT,-1,point).x>child.size.x-24: button_width.append(line)
 check(overflow.is_empty(),"Actual font heights fit: "+case_name+" / "+str(overflow))
 check(outside.is_empty(),"Actual text remains in the canvas: "+case_name+" / "+str(outside))
 check(covered.is_empty(),"Text leaves native actions uncovered: "+case_name+" / "+str(covered))
 check(button_width.is_empty(),"Actual button text fits: "+case_name+" / "+str(button_width))

func battle_chest_layout(s,dimensions: Vector2i):
 for index in [0,11]:
  var game=route_fixture(index,{} if index==0 else {"scout":"reinforce","beacons":"ward","citadel":"hold"})
  if index==11:
   game.campaign.items.ballista=0;game.campaign.items.flask=0
   check(game.place("staff",4,2,0) and game.place("ballista",0,3,0) and game.place("flask",3,2,0),"Late geometry fixture uses legal packed staff, ballista and medicine footprints")
  install(s,game,"chest");await process_frame;label_layout(s,"%s/chest/%s" % [dimensions,index])
  check(game.begin_story_node(),"Declared geometry fixture starts its real encounter")
  install(s,game,"battle");await process_frame;label_layout(s,"%s/battle/%s/first" % [dimensions,index])
  for hero in game.battle.heroes:
   s.selected=hero.id;s.chosen="";s.show_page();await process_frame
   label_layout(s,"%s/battle/%s/selected/%s" % [dimensions,index,hero.id])
   var cards=game.cards(hero.id).duplicate()
   if hero.id!="ballista": cards.append("move")
   for card in cards:
    # Preview text is read-only. Combat callback correctness is checked by the
    # earned/UI suites; here every actual available command's description fits.
    s.chosen=card;s.show_page();s.inspection.text=s.detail(card);await process_frame
    label_layout(s,"%s/battle/%s/%s/%s" % [dimensions,index,hero.id,card])
  if index==11:
   check(game.reposition("lysa",0) and game.reposition("rowan",1),"The real five-companion fixture makes room for under-fire chest collection")
   game.play("rowan","guard","");game.play("rowan","ward","merrin");game.resolve()
   check(game.battle.phase=="playing" and game.battle.story.progress==1,"A real survival phase reaches the collected-chest objective wording")
   install(s,game,"battle");await process_frame;label_layout(s,"%s/engine/collected" % dimensions)

func authored_layout(s):
 # These are read-only geometry fixtures, not legal-route/earned-state claims.
 # Neither navigation callbacks nor persistence are invoked by this sweep.
 root.content_scale_size=Vector2i(1440,900);root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 for dimensions in [Vector2i(1440,900),Vector2i(1152,720)]:
  root.size=dimensions;await process_frame
  check(root.size==dimensions,"The font/layout sweep uses the actual requested desktop window size")
  for index in range(Game.StoryData.NODES.size()):
   var game=Game.new();game.enroll_story();game.campaign.story.node=index
   game.campaign.mage=index>=6
   for phase in ["intro","outro"]:
    game.campaign.story.phase=phase
    for line in range(Game.StoryData.NODES[index][phase].size()):
     game.campaign.story.line=line
     var before=game.snapshot();install(s,game,"story");await process_frame
     check(game.snapshot()==before,"Dialogue composition is read-only for every authored line")
     label_layout(s,"%s/%s/%s/%s" % [dimensions,index,phase,line])
   game.campaign.story.phase="prepare";install(s,game,"keep");await process_frame
   label_layout(s,"%s/road/%s" % [dimensions,index])
  for decisions in [{"scout":"reinforce","beacons":"ward","citadel":"hold"},{"scout":"decoy","beacons":"sunder","citadel":"evacuate"}]:
   var game=Game.new();game.enroll_story();game.campaign.story.node=11;game.campaign.story.phase="ending";game.campaign.story.decisions=decisions;game.campaign.mage=true
   for line in range(game.story_lines().size()):
    game.campaign.story.line=line;install(s,game,"story");await process_frame
    label_layout(s,"%s/ending/%s/%s" % [dimensions,decisions.citadel,line])
  await battle_chest_layout(s,dimensions)

func playtest_regressions():
 # Native playtest findings, October 3: guidance stayed hidden behind restored
 # focus, chosen commands showed no legal targets, and rescued Ivo detached from Rowan.
 var s=Main.new();root.add_child(s);s.muted=true;s.reduced_motion=true
 await process_frame
 for line in range(3): press(s,"story_continue")
 press(s,"story_march")
 var lesson=s.coach_hint()
 check(not lesson.is_empty() and s.inspection.text==lesson.body,"Battle start keeps the first lesson visible despite card focus")
 var skip=control(s,"Skip lessons")
 check(skip!=null and skip.get_rect().end.y<=164,"Skip lessons stays inside the objective panel, clear of front labels")
 press(s,"command_ward")
 check(s.field.is_legal_target("rowan") and s.field.is_legal_target("lysa"),"Chosen Shield marks its legal ally targets")
 check(not s.field.is_legal_target(s.game.battle.enemies[0].id),"Enemies are not marked as Shield targets")
 check(s.inspection.text==s.coach_hint().body,"Choosing a card shows the target instruction, not the focused card text")
 key(s,KEY_ESCAPE)
 check(not s.field.is_legal_target("rowan"),"Cancelling the command clears target markers")
 var scout=route_fixture(2,{});check(scout.begin_story_node(),"Scout fixture starts its real encounter")
 install(s,scout,"battle")
 check(s.field.carrier_position()==s.field.unit_position(scout.ally("rowan"),false),"Ivo's escort position follows Rowan's actual crossing position")
 s.queue_free();await process_frame

func run():
 if "--story-demo" not in OS.get_cmdline_user_args():
  push_error("Crossing story tests require --story-demo; no player files are opened.");quit(1);return
 var screen=Main.new();root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 await process_frame
 check(screen.demo and screen.page=="story","The isolated runtime opens the real story surface")
 var snapshot=screen.game.snapshot();screen.show_page()
 check(screen.game.snapshot()==snapshot and text_present(screen,"families below the causeway"),"World composition preserves the exact unread authored opening")
 press(screen,"Menu");key(screen,KEY_ESCAPE)
 check(screen.page=="story" and screen.game.snapshot()==snapshot,"Menu returns to the same unread line without changing the save")
 for line in range(3): press(screen,"story_continue")
 check(screen.page=="keep" and screen.game.campaign.story.phase=="prepare","Three real callbacks consume the complete opening")
 for node in Game.StoryData.NODES: check(text_present(screen,node.title),"The connected road retains its authored stop: "+node.id)
 check(preview(screen)!=null,"Camp shows the real physical loadout")
 earned_gate(screen)
 await process_frame;label_layout(screen,"first-earned-reward")
 check(screen.game.level()==2 and screen.game.campaign.items.has("cube") and not screen.game.campaign.placements.has("cube"),"The first real reward owns a stored Storm rune and company level two")
 snapshot=screen.game.snapshot();screen.show_page()
 var chest_preview=preview(screen)
 check(chest_preview!=null and chest_preview.mouse_filter==Control.MOUSE_FILTER_IGNORE and chest_preview.get_signal_connection_list("placed").is_empty(),"Reward chest is unmistakably a read-only loadout, with no packing callback")
 check(screen.game.snapshot()==snapshot and text_present(screen,"Cleave 8 → 10"),"The real rune payoff is visible without applying a speculative placement")
 Story.open_pack(screen)
 check(screen.page=="battle" and screen.game.snapshot()==snapshot,"Reward cannot navigate into illegal packing while the victory battle is retained")
 press(screen,"story_reward_continue")
 check(screen.page=="story" and screen.game.snapshot()==snapshot,"Reward continuation opens the existing first aftermath line without skipping it")
 for step in range(8):
  if screen.game.campaign.story.phase not in ["outro","intro"]: break
  press(screen,"story_continue")
 check(screen.page=="chest" and screen.gear=="cube" and screen.game.story_node().id=="ashen","Complete aftermath and briefing automatically reach legal rune packing")
 check(not screen.game.message.begins_with("Home again"),"Story camp footer names the next task, not the legacy keep message")
 key(screen,KEY_F)
 check(screen.game.empowered("blade"),"Actual packing input links the earned rune to Emberblade")
 check(text_present(screen,"+2 Volley damage")==screen.game.empowered("bow"),"Chest payoff names every weapon the rune actually links")
 press(screen,"← Company road");press(screen,"story_march")
 check(screen.game.damage_against("rowan","cleave",screen.game.battle.enemies[0])==10,"Next actual story encounter receives the promised ten-damage Cleave")
 await recruitment(screen)
 await playtest_regressions()
 await authored_layout(screen)
 screen.queue_free();await process_frame;await process_frame
 print("CROSSING STORY TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
