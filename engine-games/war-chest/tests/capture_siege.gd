extends SceneTree
## Deterministic rendering fixtures. Does not read or write a player save.
const Main=preload("res://scripts/iron_main.gd")
func _init(): call_deferred("capture")
func capture():
 var screen=Main.new()
 root.add_child(screen)
 root.size=Vector2i(1440,900)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 screen.game.new_campaign()
 screen.demo=true
 var alpha=Image.load_from_file("res://assets/siege/siege_units_alpha.png")
 print("ALPHA CORNERS: ",alpha.get_pixel(0,0)," ",alpha.get_pixel(511,511))
 DirAccess.make_dir_recursive_absolute("res://artifacts/iron")
 for page in ["keep","chest","forge","battle","reward"]:
  screen.page=page
  if page=="battle": screen.game.begin(0)
  if page=="reward": screen.game.settle(true);screen.page="battle"
  screen.show_page()
  await process_frame
  await process_frame
  await RenderingServer.frame_post_draw
  root.get_texture().get_image().save_png("res://artifacts/iron/"+page+"-1440.png")
 screen.game.return_to_camp();screen.game.begin(1)
 screen.page="battle";screen.show_page()
 root.size=Vector2i(1152,720)
 await process_frame
 await process_frame
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png("res://artifacts/iron/battle-1152.png")
 print("NATIVE FIXTURES CAPTURED")
 quit()
