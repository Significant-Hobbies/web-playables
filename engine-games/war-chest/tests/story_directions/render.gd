extends SceneTree
const Preview = preload("res://tests/story_directions/preview.gd")
const OUTPUT = "res://artifacts/story-directions"
var failures = 0
var behavior_checks = 0
func _init(): call_deferred("run")
func shot(screen, name):
 await process_frame
 await process_frame
 for child in screen.get_children():
  if child is Label or child is Button:
   if not Rect2(0,0,1440,900).encloses(child.get_rect()):
    failures+=1;push_error("Preview outside canvas: "+name+" / "+child.text)
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png(OUTPUT+"/"+name+".png")
func verify_controls(screen):
 for direction in range(3):
  screen.direction=direction;screen.context="dialogue";screen.feedback="";screen.rebuild()
  var controls=screen.get_children().filter(func(child):return child is Button)
  var chosen=controls[1];var expected=chosen.text
  chosen.grab_focus();chosen.pressed.emit()
  await process_frame
  behavior_checks+=1
  if screen.feedback!="Preview choice: "+expected or root.gui_get_focus_owner()==null or root.gui_get_focus_owner().text!=expected:
   failures+=1;push_error("Preview choice/focus failed: "+str(direction))
  var navigation=screen.get_children().filter(func(child):return child is Button)[0]
  navigation.grab_focus();navigation.pressed.emit()
  await process_frame
  behavior_checks+=1
  if screen.context!="journey" or screen.feedback!="" or root.gui_get_focus_owner()==null:
   failures+=1;push_error("Preview context/focus failed: "+str(direction))
func run():
 if "--story-directions-demo" not in OS.get_cmdline_user_args(): quit(1);return
 DirAccess.make_dir_recursive_absolute(OUTPUT)
 root.content_scale_size = Vector2i(1440,900)
 root.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP
 var screen=Preview.new();screen.size=Vector2(1440,900);root.add_child(screen)
 for dimensions in [Vector2i(1440,900),Vector2i(1152,720)]:
  root.size=dimensions
  for direction in range(3):
   screen.direction=direction
   for context in ["dialogue","journey"]:
    screen.context=context;screen.rebuild()
    await shot(screen,["a-company-consequences","b-orders-letters","c-at-the-fire"][direction]+"-"+context+"-%dx%d" % [dimensions.x,dimensions.y])
 await verify_controls(screen)
 screen.queue_free();await process_frame
 print("STORY DIRECTIONS: 12 native fixtures; %d behavior checks; %d failures; no game/save access" % [behavior_checks,failures])
 quit(1 if failures else 0)
