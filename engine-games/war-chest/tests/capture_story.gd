extends SceneTree
## Actual Main renders, using isolated UI fixtures only.
## Injected milestones/settlement are NOT proof of an earned campaign route.
const Main=preload("res://scripts/pocket_main.gd")
const StoryGame=preload("res://scripts/story_game.gd")
const OUTPUT="res://artifacts/story-mode"
var screen
var captures=0
var failures=0

func _init():call_deferred("capture")

func expect(ok: bool,message: String):
 if not ok:failures+=1;push_error(message)

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
 expect(game.validate_save(game.snapshot())=="","UI fixture must satisfy the story save schema")
 return game

func install(game,page: String):
 screen.cancel_combat_animation()
 screen.game=game;screen.field.game=game
 screen.page=page;screen.selected="rowan";screen.chosen="";screen.target=""
 screen.battle_notice="";screen.mastery_notice="";screen.coaching=false

func shot(state: String,suffix: String):
 screen.show_page()
 await process_frame;await process_frame
 await RenderingServer.frame_post_draw
 var error=root.get_texture().get_image().save_png(OUTPUT+"/"+state+"-"+suffix+".png")
 expect(error==OK,"Native story fixture PNG was written: "+state)
 captures+=1

func capture():
 var args=OS.get_cmdline_user_args()
 if not ("--pocket-demo" in args and "--story-ui-fixtures" in args):
  push_error("Story capture requires --pocket-demo --story-ui-fixtures; no player storage is permitted.")
  quit(1);return
 DirAccess.make_dir_recursive_absolute(OUTPUT)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 root.content_scale_aspect=Window.CONTENT_SCALE_ASPECT_KEEP
 screen=Main.new();root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 for dimensions in [Vector2i(1440,900),Vector2i(1152,720)]:
  root.size=dimensions
  var suffix="%dx%d" % [dimensions.x,dimensions.y]
  var opening=StoryGame.new();expect(opening.enroll_story(),"UI fixture enrolls the opening story")
  install(opening,"story");await shot("initial-scene",suffix)
  for step in range(8):
   if opening.campaign.story.phase!="intro":break
   var advanced=opening.advance_story();expect(advanced,"Opening dialogue advances to preparation")
   if not advanced:break
  expect(opening.campaign.story.phase=="prepare","Opening fixture reaches preparation within its authored lines")
  install(opening,"keep");await shot("preparation",suffix)
  expect(opening.begin_story_node(),"Prepared fixture begins its actual Gate encounter")
  opening.retreat();install(opening,"battle");await shot("defeat",suffix)
  expect(opening.return_to_camp() and opening.begin_story_node(),"Gate UI fixture retries its modeled encounter")
  # UI-only settlement displays the earned-rune presentation, not earned play.
  opening.settle(true);install(opening,"battle");await shot("gate-reward",suffix)
  for step in range(8):
   if opening.campaign.story.phase!="outro":break
   if not opening.advance_story():break
  for step in range(8):
   if opening.campaign.story.phase!="intro":break
   if not opening.advance_story():break
  expect(opening.story_node().id=="ashen" and opening.campaign.story.phase=="prepare","Rune UI fixture reaches Ashen preparation")
  expect(opening.validate_save(opening.snapshot())=="","Rune UI fixture validates")
  install(opening,"chest");screen.gear="cube";screen.chest_cursor=Vector2i(1,0)
  await shot("earned-rune-chest",suffix)
  var choice=fixture(2,{})
  expect(choice.begin_story_node(),"Scout UI fixture begins")
  # UI-only settlement supplies the canonical post-rescue choice, not earned proof.
  choice.battle.quest.progress=2;choice.settle(true)
  if choice.has_loot():expect(choice.claim_banner(choice.battle.loot[0]),"Choice fixture claims its actual offered banner")
  choice.campaign.story.line=choice.story_lines().size()-1
  expect(choice.validate_save(choice.snapshot())=="","Choice UI fixture validates")
  install(choice,"story");await shot("ivo-choice",suffix)
  choice.save_error="Save could not be written. Move the damaged file aside before relaunching."
  await shot("ivo-choice-save-warning",suffix)
  choice.save_error=""
  var ending=fixture(11,{"scout":"decoy","beacons":"sunder","citadel":"evacuate"})
  expect(ending.begin_story_node(),"Ending UI fixture begins extraction")
  # UI-only extraction settlement: canonical ending content, never a solver claim.
  ending.battle.story.progress=2;ending.battle.story.carrier="rowan";ending.settle(true)
  if ending.has_loot():expect(ending.claim_banner(ending.battle.loot[0]),"Ending fixture claims its actual offered banner")
  ending.campaign.story.line=ending.story_lines().size()-1
  expect(ending.advance_story() and ending.campaign.story.phase=="ending","Completed UI fixture opens the epilogue")
  ending.campaign.story.line=2
  expect(ending.validate_save(ending.snapshot())=="","Ending UI fixture validates")
  install(ending,"story");await shot("ending-decoy",suffix)
  ending.campaign.story.line=4
  install(ending,"story");await shot("ending-evacuation",suffix)
 screen.queue_free();await process_frame;await process_frame
 print("STORY UI CAPTURES: %d native fixtures, %d failures; injected UI state only, no earned-route claim or player storage" % [captures,failures])
 quit(1 if failures else 0)
