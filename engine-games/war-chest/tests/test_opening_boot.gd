extends SceneTree
const Main=preload("res://scripts/pocket_main.gd")
func _init(): call_deferred("run")
func run():
 var args=OS.get_cmdline_user_args()
 if "--pocket-demo" not in args or "--banner-opening" not in args: quit(1);return
 var screen=Main.new();root.add_child(screen);screen.muted=true
 await process_frame
 var ok=screen.demo and screen.page=="battle" and screen.game.battle.mission==0 and screen.game.opening_stage()==0 and not screen.game.campaign.items.has("cube")
 if not ok: push_error("FAIL: practice boot must open actual first defense without reading or writing saves")
 screen.queue_free();await process_frame;await process_frame
 print("OPENING BOOT TESTS: 1 checks, %d failures" % (0 if ok else 1))
 quit(0 if ok else 1)
