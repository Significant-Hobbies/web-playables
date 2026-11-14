extends SceneTree
## Captures original drawing instructions, not native screenshots.
const OUT="res://artifacts/game-experience-2026-10-03"
func _init():call_deferred("run")
func run():
 if "--experience-directions-static" not in OS.get_cmdline_user_args():quit(1);return
 DirAccess.make_dir_recursive_absolute(OUT)
 for item in [["a-crossing","crossing"],["b-table","table"],["c-road","road"]]:
  var script=load("res://tests/game_experience_directions/"+item[1]+".gd")
  if script==null:quit(1);return
  for state in ["battle","camp"]:
   var screen=script.new();screen.size=Vector2(1440,900);screen.recording=true
   root.add_child(screen);screen.render(state);screen._draw()
   var file=FileAccess.open(OUT+"/"+item[0]+"-"+state+"-drawing.json",FileAccess.WRITE)
   file.store_string(JSON.stringify({"direction":item[0],"context":state,"method":"static storyboard drawing commands; native rendering blocked","canvas":[1440,900],"primitives":screen.primitives,"controls":screen.controls}," "))
   screen.queue_free();await process_frame
 print("STATIC DIRECTIONS: 6 isolated drawing records; no native screenshots or save access")
 quit()
