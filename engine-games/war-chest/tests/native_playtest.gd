extends SceneTree
## Native (rendered, non-headless) playtest driver for agents.
## Runs the real main scene in practice mode and executes commands appended to a
## text file, so an agent can click, press keys and capture real frames.
## Requires --story-demo (or --pocket-demo): practice mode never reads/writes saves.
## Usage: Godot --path . --script res://tests/native_playtest.gd -- --story-demo --playtest-dir=/abs/dir
## Commands (one per line in <dir>/cmd.txt): shot NAME | click X Y (logical 1440x900) |
## move X Y | key NAME | button TEXT (clicks first visible enabled Button containing TEXT) |
## wait FRAMES | dump | quit
var dir="res://artifacts/native-playtest"
var main: Control
var done=0
var waiting=0
var busy=false

func _init(): call_deferred("start")

func start():
 var args=OS.get_cmdline_user_args()
 if not ("--story-demo" in args or "--pocket-demo" in args):
  push_error("native_playtest requires --story-demo or --pocket-demo; player storage is never used.")
  quit(1);return
 for a in args:
  if a.begins_with("--playtest-dir="): dir=a.substr(15)
 DirAccess.make_dir_recursive_absolute(dir)
 main=load("res://scenes/pocket.tscn").instantiate()
 root.add_child(main)
 main.muted=true
 log_line("ready window=%s" % [root.size])
 process_frame.connect(tick)

func log_line(s: String):
 var f=FileAccess.open(dir+"/log.txt",FileAccess.READ_WRITE if FileAccess.file_exists(dir+"/log.txt") else FileAccess.WRITE)
 f.seek_end();f.store_line(s);f.close()

func tick():
 if busy: return
 if waiting>0: waiting-=1;return
 if not FileAccess.file_exists(dir+"/cmd.txt"): return
 var lines=FileAccess.get_file_as_string(dir+"/cmd.txt").split("\n",false)
 if done>=lines.size(): return
 var line=lines[done].strip_edges();done+=1
 busy=true
 await run(line)
 busy=false

func to_window(p: Vector2) -> Vector2:
 return root.get_final_transform()*p

func click(p: Vector2):
 # Motion, press and release are queued together so a real cursor moving over
 # the window cannot slip between them.
 var w=to_window(p)
 var move=InputEventMouseMotion.new();move.position=w;move.global_position=w
 Input.parse_input_event(move)
 for pressed in [true,false]:
  var e=InputEventMouseButton.new();e.button_index=MOUSE_BUTTON_LEFT;e.pressed=pressed;e.position=w;e.global_position=w
  Input.parse_input_event(e)
 Input.flush_buffered_events()
 await process_frame;await process_frame

func buttons() -> Array:
 var out=[]
 var stack=[main]
 while not stack.is_empty():
  var n=stack.pop_back()
  if n is Button and n.is_visible_in_tree(): out.append(n)
  for c in n.get_children(): stack.append(c)
 return out

func run(line: String):
 var parts=line.split(" ",false)
 if parts.is_empty(): return
 log_line("> "+line)
 match parts[0]:
  "shot":
   await process_frame;await process_frame
   # force_draw renders even when macOS reports the window as occluded.
   RenderingServer.force_draw(false)
   var img=root.get_texture().get_image()
   img.save_png(dir+"/"+parts[1]+".png")
   log_line("shot %s %s page=%s" % [parts[1],img.get_size(),main.page])
  "click": await click(Vector2(float(parts[1]),float(parts[2])))
  "button":
   var needle=line.substr(7)
   for b in buttons():
    if not b.disabled and (needle in b.text or needle==str(b.get_meta("focus_key",""))):
     log_line("clicking [%s] at %s" % [b.text.replace("\n"," / "),b.get_global_rect()])
     await click(b.get_global_rect().get_center());return
   log_line("NO BUTTON "+needle)
  "key":
   var e=InputEventKey.new();e.keycode=OS.find_keycode_from_string(parts[1]);e.physical_keycode=e.keycode;e.pressed=true
   Input.parse_input_event(e);await process_frame
   var r=e.duplicate();r.pressed=false;Input.parse_input_event(r);await process_frame
  "wait": waiting=int(parts[1])
  "move":
   var w=to_window(Vector2(float(parts[1]),float(parts[2])))
   var m=InputEventMouseMotion.new();m.position=w;m.global_position=w
   Input.parse_input_event(m);await process_frame
  "dump":
   var s="page=%s selected=%s chosen=%s target=%s" % [main.page,main.selected,main.chosen,main.target]
   if not main.game.battle.is_empty(): s+=" phase=%s" % main.game.battle.get("phase","")
   var focus=main.get_viewport().gui_get_focus_owner()
   s+=" focus=%s" % (focus.get_meta("focus_key",focus.text) if focus is Button else "-")
   if is_instance_valid(main.inspection): s+="\ninspection: "+main.inspection.text
   s+="\nmessage: "+str(main.game.message)
   for b in buttons():
    s+="\n  [%s]%s key=%s rect=%s" % [b.text.replace("\n"," / "),(" DISABLED" if b.disabled else ""),b.get_meta("focus_key",""),b.get_global_rect()]
   var stack=[main.hud]
   while not stack.is_empty():
    var n=stack.pop_back()
    if n is Label and n.is_visible_in_tree() and n.text!="": s+="\n  L: "+n.text.replace("\n"," / ")
    for c in n.get_children(): stack.append(c)
   log_line(s)
  "quit": quit(0)
