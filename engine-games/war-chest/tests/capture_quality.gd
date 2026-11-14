extends SceneTree
## Native rendered fixtures, never a player campaign or proof of human enjoyment.
const Main=preload("res://scripts/pocket_main.gd")
var screen
const OUTPUT="res://artifacts/quality-2026-10-02"

func _init(): call_deferred("capture")

func shot(label: String):
 screen.show_page()
 await process_frame
 await process_frame
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png(OUTPUT+"/"+label+".png")

func capture():
 if "--pocket-demo" not in OS.get_cmdline_user_args(): quit(1);return
 DirAccess.make_dir_recursive_absolute(OUTPUT)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 root.content_scale_aspect=Window.CONTENT_SCALE_ASPECT_KEEP
 screen=Main.new();root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 for dimensions in [Vector2i(1152,720),Vector2i(1440,900),Vector2i(1600,900),Vector2i(1440,1000)]:
  root.size=dimensions
  var suffix="%dx%d" % [dimensions.x,dimensions.y]
  screen.game.new_campaign();screen.game.enroll_opening();screen.game.begin(0)
  screen.page="battle";screen.selected="rowan";screen.chosen="";screen.battle_notice=""
  await shot("opening-"+suffix)
  screen.chosen="move";await shot("move-"+suffix)
  screen.chosen="";screen.game.save_error="Save could not be written. Move the damaged file aside before relaunching."
  await shot("save-warning-"+suffix)
  screen.game.save_error=""
  screen.game.settle(true);await shot("rune-reward-"+suffix)
  screen.return_to_keep();await shot("rune-chest-"+suffix)
  screen.game.new_campaign();screen.game.campaign.xp=350;screen.game.campaign.unlocked=5
  screen.game.campaign.wins=[1,1,1,1,1,1];screen.game.campaign.mage=true
  screen.game.campaign.mastery={"rowan":4,"lysa":4,"fen":4,"merrin":4}
  screen.game.campaign.journey.completed=["scout","relic","citadel"]
  for id in screen.Game.ITEMS: screen.game.campaign.items[id]=0
  screen.page="keep";screen.keep_mode="quests";screen.quest_id="engine";await shot("quests-"+suffix)
  screen.keep_mode="banners";await shot("banners-"+suffix)
  screen.page="chest";await shot("all-equipment-"+suffix)
  screen.page="shop";await shot("quartermaster-"+suffix)
  screen.page="guide";screen.guide_return="keep";await shot("manual-"+suffix)
  screen.game.begin(5);screen.page="battle";screen.selected="rowan";screen.coaching=false
  await shot("late-battle-"+suffix)
  screen.reduced_motion=false;screen.choose_card("guard");screen.resolve_turn()
  await create_timer(0.8).timeout
  await shot("enemy-aftermath-"+suffix)
  screen.reduced_motion=true
  screen.game.settle(true);await shot("mastery-reward-"+suffix)
 screen.queue_free();await process_frame;await process_frame
 print("QUALITY CAPTURES: 52 native fixtures, isolated practice state")
 quit()
