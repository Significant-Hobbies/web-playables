extends SceneTree
## Actual Main renders with isolated, schema-checked onboarding UI fixtures.
## Injected milestones and settlement never establish an earned campaign route.
const Main=preload("res://scripts/pocket_main.gd")
const StoryGame=preload("res://scripts/story_game.gd")
const OUTPUT="res://artifacts/story-onboarding"
const WINDOWS=[Vector2i(1152,720),Vector2i(1440,900),Vector2i(1600,1000)]
var screen
var captures=0
var failures=0
var evidence=[]

func _init():call_deferred("capture")

func expect(ok: bool,message: String):
 if not ok:failures+=1;push_error(message)

func fixture(index: int,decisions: Dictionary={}):
 var game=StoryGame.new();expect(game.enroll_story(),"Fixture enrolls an isolated story")
 game.campaign.story.node=index;game.campaign.story.phase="prepare"
 game.campaign.story.decisions={}
 for previous in range(index):
  var node=StoryGame.StoryData.NODES[previous]
  game.campaign.story.completed.append(node.id);game.campaign.xp+=node.xp
  if not node.choices.is_empty():
   expect(decisions.has(node.id),"Fixture supplies its completed story decision: "+node.id)
   if decisions.has(node.id):game.campaign.story.decisions[node.id]=decisions[node.id]
  for id in ["rowan","lysa","fen"]:game.campaign.mastery[id]=mini(9,previous+1)
  if previous>5:game.campaign.mastery.merrin=mini(9,previous-5)
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
  expect(game.place("cube",1,0,0),"Later UI fixture retains its packed earned rune")
 if game.level()>=4:game.campaign.items.frost=0
 expect(game.validate_save(game.snapshot())=="","Injected UI fixture satisfies the story save schema")
 return game

func install(game,page: String,lessons=false):
 screen.cancel_combat_animation()
 screen.game=game;screen.field.game=game
 screen.page=page;screen.selected="rowan";screen.chosen="";screen.target=""
 screen.battle_notice="";screen.mastery_notice="";screen.coaching=lessons
 screen.undo={};screen.gear="blade";screen.chest_cursor=Vector2i.ZERO

func focus_command(id: String):
 screen.show_page()
 for child in screen.hud.get_children():
  if child is Button and child.get_meta("focus_key","")=="command_"+id:
   child.grab_focus();return
 expect(false,"Command preview fixture has its real focusable card: "+id)

func shot(state: String,dimensions: Vector2i):
 screen.show_page()
 await process_frame;await process_frame
 await RenderingServer.frame_post_draw
 var rendered=root.get_texture().get_image()
 var suffix="%dx%d" % [dimensions.x,dimensions.y]
 var path=OUTPUT+"/"+state+"-"+suffix+".png"
 var image_size=Vector2i(rendered.get_width(),rendered.get_height())
 expect(root.size==dimensions,"Reported native window equals requested dimensions: "+state)
 expect(image_size==dimensions,"Viewport readback covers the entire same-aspect native window: "+state)
 expect(rendered.save_png(path)==OK,"Native onboarding PNG was written: "+state)
 var logical_viewport=root.get_visible_rect().size
 evidence.append({
  "state":state,"path":path.trim_prefix("res://"),"kind":"native-UI-fixture",
  "requested_window_size":[dimensions.x,dimensions.y],
  "engine_window_size":[root.size.x,root.size.y],
  "logical_viewport_size":[logical_viewport.x,logical_viewport.y],
  "png_size":[image_size.x,image_size.y],
  "base_canvas_size":[1440,900],
  "display_scale":DisplayServer.screen_get_scale(root.current_screen),
  "window_content_scale_factor":root.content_scale_factor
 })
 captures+=1

func reward_fixture(index: int):
 var game=fixture(index,{"scout":"decoy","beacons":"ward","citadel":"hold"})
 expect(game.begin_story_node(),"Reward UI fixture begins its actual authored encounter")
 if game.story_node().id=="relic":
  game.battle.quest.progress=3
  game.battle.story.progress=2;game.battle.story.carrier="rowan"
 elif game.story_node().id=="convoy":game.battle.quest.progress=4
 elif game.story_node().id=="beacons":game.battle.quest.progress=3
 # This is UI-only settlement, never proof of earned victory or route completion.
 game.settle(true)
 expect(game.battle.phase=="victory","Reward UI fixture settles into its modeled victory")
 expect(game.validate_save(game.snapshot())=="","Reward UI fixture validates before rendering")
 return game

func capture():
 var args=OS.get_cmdline_user_args()
 if not ("--story-demo" in args and "--onboarding-ui-fixtures" in args):
  push_error("Onboarding capture requires --story-demo --onboarding-ui-fixtures; no player storage is permitted.")
  quit(1);return
 if "--banner-opening" in args:
  push_error("Do not combine an onboarding story fixture with --banner-opening.")
  quit(1);return
 DirAccess.make_dir_recursive_absolute(OUTPUT)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 root.content_scale_aspect=Window.CONTENT_SCALE_ASPECT_KEEP
 screen=Main.new();root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 expect(screen.demo,"Main is in isolated demo mode before fixture installation")
 for dimensions in WINDOWS:
  root.size=dimensions
  await process_frame;await process_frame
  var opening=fixture(0)
  install(opening,"keep",true);await shot("fresh-company-road",dimensions)
  expect(opening.begin_story_node(),"Prepared UI fixture begins the actual Gate encounter")
  install(opening,"battle",true);focus_command("cleave")
  await shot("first-battle-rowan",dimensions)
  var orders=int(opening.battle.commands)
  screen.select_hero("lysa")
  expect(screen.selected=="lysa" and opening.battle.commands==orders,"Actual Main selection switches to Lysa without spending orders")
  await shot("first-battle-lysa-selected",dimensions)
  screen.select_hero("rowan");screen.choose_card("cleave");screen.on_actor("enemy_1")
  expect(opening.campaign.lessons==screen.Coach.ATTACK,"An actual Main Cleave callback reaches the ranged lesson")
  screen.select_hero("lysa");await shot("first-ranged-lesson",dimensions)
  screen.guide_return="battle";screen.page="guide"
  await shot("field-manual",dimensions)
  # The opening reward is a UI-only settlement, not an earned combat claim.
  opening.settle(true)
  expect(opening.level()==2 and opening.validate_save(opening.snapshot())=="","Gate UI settlement supplies a valid level-2 reward")
  install(opening,"battle");await shot("gate-level-2-reward",dimensions)
  install(reward_fixture(3),"battle");await shot("cart-level-3-reward",dimensions)
  var joined=reward_fixture(5)
  expect(joined.campaign.mage and joined.campaign.items.has("staff") and not joined.campaign.placements.has("staff"),"Reliquary fixture joins Merrin with a stored staff")
  install(joined,"battle");await shot("merrin-joins-reward",dimensions)
  var watchfires=fixture(6,{"scout":"decoy"})
  install(watchfires,"keep");await shot("merrin-company-road",dimensions)
  expect(watchfires.begin_story_node(),"Joined-companion fixture begins Watchfires")
  install(watchfires,"battle");screen.select_hero("merrin")
  expect(screen.selected=="merrin" and not watchfires.cards("merrin").has("spark"),"Joined Merrin is selectable but has no Storm without packed staff")
  await shot("merrin-selected-staff-stored",dimensions)
  var packed=fixture(6,{"scout":"decoy"})
  expect(packed.place("staff",4,2,0),"Joined-companion fixture packs Merrin's actual staff")
  expect(packed.begin_story_node(),"Packed-staff fixture begins Watchfires")
  install(packed,"battle");screen.select_hero("merrin")
  expect(packed.cards("merrin").has("spark"),"Packing the staff exposes Merrin's actual Storm command")
  await shot("merrin-selected-staff-packed",dimensions)
  install(reward_fixture(6),"battle");await shot("watchfires-level-4-reward",dimensions)
  install(reward_fixture(8),"battle");await shot("iron-oath-level-5-reward",dimensions)
  install(reward_fixture(9),"battle");await shot("winterwatch-level-6-reward",dimensions)
  var crown=fixture(10,{"scout":"decoy","beacons":"ward","citadel":"hold"})
  expect(crown.level()==6,"Next-Crown UI fixture is company level 6")
  install(crown,"keep");await shot("level-6-company-road",dimensions)
 screen.queue_free();await process_frame;await process_frame
 var manifest=FileAccess.open(OUTPUT+"/capture-evidence.json",FileAccess.WRITE)
 expect(manifest!=null,"Native capture dimension evidence can be written")
 if manifest!=null:
  manifest.store_string(JSON.stringify({
   "capture_method":"Godot native Window viewport readback after frame_post_draw",
   "dimension_note":"Window and logical viewport dimensions are reported separately by Godot; PNG dimensions are measured, display scale is reported by DisplayServer.",
   "fixture_note":"Injected story milestones and victory settlement are UI fixtures only. No earned-route claim, player save read/write, account or network request.",
   "captures":captures,"failures":failures,"screenshots":evidence
  },"  "))
 print("ONBOARDING UI CAPTURES: %d native fixtures, %d failures; injected UI state only, no earned-route claim or player storage" % [captures,failures])
 quit(1 if failures else 0)
