extends SceneTree
## Bounded native frame-pacing evidence on this machine, not a cross-device claim.
const Main=preload("res://scripts/pocket_main.gd")
const OUTPUT="res://artifacts/quality-2026-10-02/native-timing.json"
var screen
var results=[]

func _init(): call_deferred("run")

func sample(label: String,animated=false):
 for frame in range(30): await process_frame
 var frames=[]
 var processing=[]
 var rebuilding=[]
 var draw_calls=0
 var previous=Time.get_ticks_usec()
 for frame in range(180):
  if animated and frame%30==0:
   var rebuild_start=Time.get_ticks_usec()
   screen.cancel_combat_animation();screen.game.new_campaign();screen.game.begin(0)
   screen.page="battle";screen.selected="rowan";screen.chosen="";screen.show_page()
   screen.choose_card("cleave");screen.on_actor("enemy_1")
   screen.resolve_turn()
   rebuilding.append(float(Time.get_ticks_usec()-rebuild_start)/1000.0)
  await process_frame
  var now=Time.get_ticks_usec()
  frames.append(float(now-previous)/1000.0);previous=now
  processing.append(Performance.get_monitor(Performance.TIME_PROCESS)*1000.0)
  draw_calls=maxi(draw_calls,int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)))
 frames.sort()
 processing.sort()
 var total=0.0
 for frame in frames: total+=frame
 results.append({"scenario":label,"frames":frames.size(),"mean_ms":total/frames.size(),"median_ms":frames[90],"p95_ms":frames[171],"max_ms":frames[-1],"godot_process_monitor_p95_ms":processing[171],"rebuild_ms":rebuilding,"max_draw_calls":draw_calls,"nodes":Performance.get_monitor(Performance.OBJECT_NODE_COUNT)})

func run():
 if "--pocket-demo" not in OS.get_cmdline_user_args() or DisplayServer.get_name()=="headless":
  push_error("Native timing requires a graphical isolated --pocket-demo session.");quit(1);return
 root.size=Vector2i(1440,900)
 root.content_scale_size=Vector2i(1440,900)
 root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 root.content_scale_aspect=Window.CONTENT_SCALE_ASPECT_KEEP
 screen=Main.new();root.add_child(screen);screen.muted=true;screen.coaching=false
 screen.game.begin(0);screen.page="battle";screen.show_page()
 await sample("battle-idle")
 await sample("attack-enemy-turn-rebuild",true)
 screen.cancel_combat_animation();screen.game.retreat();screen.game.return_to_camp()
 for id in screen.Game.ITEMS:screen.game.campaign.items[id]=0
 screen.page="chest";screen.show_page();await sample("full-equipment-chest")
 var output=FileAccess.open(OUTPUT,FileAccess.WRITE)
 output.store_string(JSON.stringify({"engine":Engine.get_version_info().string,"display":DisplayServer.get_name(),"window":str(root.size),"rendering_method":RenderingServer.get_current_rendering_method(),"scenarios":results},"  "))
 print("NATIVE TIMING: ",JSON.stringify(results))
 screen.queue_free();await process_frame;await process_frame
 quit()
