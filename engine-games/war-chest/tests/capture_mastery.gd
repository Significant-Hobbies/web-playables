extends SceneTree
const Main=preload("res://scripts/pocket_main.gd")
var screen
func _init(): call_deferred("capture")
func shot(label: String):
 screen.show_page()
 await process_frame
 await process_frame
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png("res://artifacts/mastery/"+label+".png")
func capture():
 if "--pocket-demo" not in OS.get_cmdline_user_args(): quit(1);return
 root.size=Vector2i(1440,900);root.content_scale_size=Vector2i(1440,900);root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 DirAccess.make_dir_recursive_absolute("res://artifacts/mastery")
 screen=Main.new();root.add_child(screen);screen.muted=true
 screen.game.campaign.xp=210;screen.game.campaign.unlocked=3;screen.game.campaign.mage=true
 screen.game.campaign.mastery={"rowan":4,"lysa":4,"fen":4,"merrin":4}
 var fixture=screen.game.snapshot()
 for width in [1440,1152]:
  screen.game.restore(fixture);screen.mission=3;screen.battle_notice="";screen.chosen="";screen.mastery_notice=""
  root.size=Vector2i(width,int(width*0.625))
  screen.page="keep";await shot("keep-%d" % width)
  screen.show_mastery("lysa");await shot("keep-inspection-%d" % width)
  screen.mastery_notice=""
  screen.game.begin(3);screen.page="battle";await shot("battle-%d" % width)
  screen.move_to(2)
  screen.choose_card("guard")
  await shot("mastery-command-%d" % width)
  screen.game.settle(true);await shot("reward-%d" % width)
  screen.show_mastery("rowan");await shot("reward-inspection-%d" % width)
  screen.mastery_notice=""
  screen.game.claim_banner(screen.game.battle.loot[0]);await shot("claimed-%d" % width)
  screen.return_to_keep()
  screen.game.campaign.mastery={"rowan":4,"lysa":4,"fen":4,"merrin":4}
 print("MASTERY CAPTURES READY")
 quit()
