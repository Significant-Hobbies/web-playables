extends SceneTree
## Lifecycle stress only. Headless execution is not native background-crash proof.
const Main=preload("res://scripts/pocket_main.gd")
var checks=0
var failures=0

func check(ok: bool,label: String):
 checks+=1
 if not ok:failures+=1;push_error("FAIL: "+label)

func _init():call_deferred("run")

func run():
 if "--pocket-demo" not in OS.get_cmdline_user_args():quit(1);return
 var screen=Main.new();root.add_child(screen);screen.muted=true
 var counts=[]
 for cycle in range(40):
  screen.cancel_combat_animation();screen.game.new_campaign()
  screen.page="keep";screen.keep_mode="campaign";screen.mission=0;screen.start_battle()
  var original=screen.game.snapshot()
  screen.choose_card("cleave");screen.on_actor("enemy_1");screen.undo_action()
  check(screen.game.snapshot()==original,"attack/undo restores exact state: %d" % cycle)
  screen.move_to(2);screen.undo_action()
  check(screen.game.snapshot()==original,"movement/undo restores exact state: %d" % cycle)
  screen.choose_card("cleave");screen.on_actor("enemy_1");screen.resolve_turn()
  screen.navigate("guide");screen.navigate("battle")
  check(not screen.field.motion.active() and not screen.finishing_impact,"navigation clears motion: %d" % cycle)
  screen.game.retreat();screen.finish_combat_animation();screen.return_to_keep()
  for page in ["chest","shop","guide","keep"]:screen.navigate(page)
  await process_frame;await process_frame
  counts.append(Performance.get_monitor(Performance.OBJECT_NODE_COUNT))
  check(screen.game.battle.is_empty() and screen.page=="keep","cycle returns to idle keep: %d" % cycle)
 var tail=counts.slice(10)
 check(tail.max()-tail.min()<=2,"node count remains flat after repeated HUD rebuilds")
 print("STABILITY: 40 battle/navigation cycles; warmed node range ",tail.min(),"–",tail.max())

 # Real elapsed idle periods, with no manual calls to _process or timer callbacks.
 var idle=screen.game.snapshot();var start=Time.get_ticks_msec()
 await create_timer(5.0).timeout
 check(screen.game.snapshot()==idle and screen.page=="keep","five-second keep idle does not mutate progression")
 screen.mission=0;screen.start_battle();idle=screen.game.snapshot()
 await create_timer(10.0).timeout
 check(screen.game.snapshot()==idle and screen.page=="battle","ten-second battle idle does not advance combat")
 check(not screen.field.motion.active() and not screen.finishing_impact,"idle has no perpetual combat animation")
 print("STABILITY: idle elapsed ms ",Time.get_ticks_msec()-start)
 screen.queue_free();await process_frame;await process_frame
 var roots=root.get_child_count()
 var orphan_baseline=Performance.get_monitor(Performance.OBJECT_ORPHAN_NODE_COUNT)
 for cycle in range(12):
  var fresh=Main.new();root.add_child(fresh);fresh.muted=true
  fresh.start_battle();fresh.choose_card("cleave");fresh.on_actor("enemy_1")
  fresh.queue_free();await process_frame;await process_frame
  check(root.get_child_count()==roots,"closing during animation frees the scene: %d" % cycle)
 check(Performance.get_monitor(Performance.OBJECT_ORPHAN_NODE_COUNT)<=orphan_baseline,"repeated close does not leave orphan nodes")
 print("STABILITY TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
