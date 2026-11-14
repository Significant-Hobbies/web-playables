extends SceneTree
## Native preview renderer only. Does not load or mutate a player campaign.
const OUTPUT="res://artifacts/game-experience-2026-10-03"
const PROBES=[
 ["a-crossing", "res://tests/game_experience_directions/crossing.gd"],
 ["b-table", "res://tests/game_experience_directions/table.gd"],
 ["c-road", "res://tests/game_experience_directions/road.gd"]
]
func _init(): call_deferred("run")
func run():
 if "--experience-directions" not in OS.get_cmdline_user_args():quit(1);return
 DirAccess.make_dir_recursive_absolute(OUTPUT)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 root.content_scale_aspect=Window.CONTENT_SCALE_ASPECT_KEEP
 var metadata=[]
 for dimensions in [Vector2i(1440,900),Vector2i(1152,720)]:
  root.size=dimensions
  for item in PROBES:
   var source=load(item[1])
   if source==null:quit(1);return
   for state in ["battle","camp"]:
    var screen=source.new();screen.size=Vector2(1440,900)
    root.add_child(screen)
    screen.render(state)
    await process_frame;await process_frame
    await RenderingServer.frame_post_draw
    var capture=root.get_texture().get_image()
    var path=OUTPUT+"/%s-%s-%dx%d.png" % [item[0],state,dimensions.x,dimensions.y]
    capture.save_png(path)
    metadata.append({"direction":item[0],"state":state,"path":path,"windowSize":[root.size.x,root.size.y],"imageSize":[capture.get_width(),capture.get_height()],"logicalCanvas":[1440,900],"displayScale":DisplayServer.screen_get_scale(),"contentScaleFactor":root.content_scale_factor,"method":"Godot viewport native render, no window chrome","implementation":"static isolated proposal; no model or save"})
    screen.queue_free();await process_frame
 var file=FileAccess.open(OUTPUT+"/capture-evidence.json",FileAccess.WRITE)
 file.store_string(JSON.stringify(metadata," "))
 print("EXPERIENCE DIRECTIONS: 12 native renders, no campaign or save access")
 quit()
