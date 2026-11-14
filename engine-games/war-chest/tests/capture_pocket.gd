extends SceneTree
const Main=preload("res://scripts/pocket_main.gd")
func _init(): call_deferred("capture")
func capture():
 var screen=Main.new()
 root.add_child(screen)
 root.size=Vector2i(1440,900)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 screen.game.new_campaign();screen.demo=true
 var output="res://artifacts/pocket-v2" if "--v2" in OS.get_cmdline_user_args() else "res://artifacts/pocket"
 DirAccess.make_dir_recursive_absolute(output)
 for page in ["keep","chest","shop","guide","battle","reward"]:
  screen.page=page
  if page=="battle": screen.game.begin(0)
  if page=="reward": screen.game.settle(true);screen.page="battle"
  screen.show_page()
  await process_frame
  await process_frame
  await RenderingServer.frame_post_draw
  root.get_texture().get_image().save_png(output+"/"+page+"-1440.png")
 if screen.game.has_loot(): screen.game.claim_banner(screen.game.battle.loot[0])
 screen.game.return_to_camp();screen.game.begin(1)
 screen.page="battle";screen.show_page()
 root.size=Vector2i(1152,720)
 await process_frame
 await process_frame
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png(output+"/battle-1152.png")
 root.size=Vector2i(1600,900)
 await process_frame
 await process_frame
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png(output+"/battle-1600.png")
 print("POCKET FIXTURES CAPTURED")
 quit()
