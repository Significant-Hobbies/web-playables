extends SceneTree
## Predictions execute a disposable copy, including the real next enemy phase.
const Game=preload("res://scripts/story_game.gd")
const Preview=preload("res://scripts/command_preview.gd")
const Coach=preload("res://scripts/pocket_coach.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok:failures+=1;push_error("FAIL: "+label)
func _init():
 var game=Game.new();game.enroll_story()
 while game.campaign.story.phase=="intro":game.advance_story()
 check(game.begin_story_node(),"new authored crossing starts")
 check(game.battle.enemies.size()==2 and game.battle.enemies.all(func(e):return e.lane==0 and e.hp==8),"first crossing introduces only Rowan's two raiders")
 var before=game.snapshot()
 var shield=Preview.predict(game,"rowan","ward","rowan")
 check(shield.error=="" and shield.changes[0].block==8,"Shield predicts its actual eight block")
 check(Preview.incoming(game,"rowan")==6 and shield.next_hp.rowan==game.ally("rowan").hp,"Shield's next-phase preview absorbs both actual attacks")
 var cleave=Preview.predict(game,"rowan","cleave","enemy_1")
 check(cleave.error=="" and cleave.changes.size()==2 and cleave.defeated==2,"Cleave predicts both actual defeats")
 check(cleave.changes.all(func(change):return change.damage==8 and change.hp==0),"Cleave uses actual per-target health and damage")
 check(Preview.description(game,"rowan","cleave","enemy_1").contains("2 defeated"),"opening preview communicates the immediate result")
 check(Preview.predict(game,"lysa","strike","enemy_1").error!="","illegal front selection returns the real rule error")
 check(game.snapshot()==before,"repeated legal and illegal forecasts change no live model state")
 var restored=Game.new()
 check(restored.restore(before) and restored.snapshot()==before,"new formation survives an exact save round trip")
 check(game.play("rowan","cleave","enemy_1") and game.resolve(),"actual chosen opening order and enemy phase resolve")
 check(game.battle.enemies.filter(func(e):return e.hp>0).size()==3 and game.battle.enemies.filter(func(e):return e.hp>0).all(func(e):return e.hp==10),"next wave introduces every front with the established ten-health rules")
 # A stored five-enemy active crossing is preserved rather than retrofitted.
 var legacy=Game.new();legacy.begin(0)
 var old=before.duplicate(true)
 old.battle.enemies=legacy.battle.enemies.duplicate(true)
 old.battle.serial=legacy.battle.serial
 var old_copy=Game.new()
 check(old_copy.restore(old) and old_copy.snapshot()==old,"existing active crossing preserves its complete old formation")
 check(not Coach.hint(old_copy,"rowan","").body.contains("defeats both"),"old active formation does not receive the new two-raider promise")
 var last_turn=Game.new();last_turn.restore(game.snapshot());last_turn.battle.round=4
 for enemy in last_turn.battle.enemies:enemy.hp=0
 check(Coach.hint(last_turn,"lysa","").body.contains("last families"),"last-turn UI fixture describes completion instead of promising another wave")
 var next=Game.new();next.restore(game.snapshot())
 var target=next.battle.enemies.filter(func(e):return e.hp>0 and e.lane==1)[0]
 var volley=Preview.predict(next,"lysa","volley",target.id)
 var expected=Game.new();expected.restore(next.snapshot());expected.play("lysa","volley",target.id)
 check(volley.error=="" and volley.changes[0].hp==expected.foe(target.id).hp,"later-front Volley preview matches actual execution")
 expected.resolve()
 for hero in expected.battle.heroes:
  check(volley.next_hp[hero.id]==hero.hp,"forecasted next-phase health matches actual resolution: "+hero.id)
 print("COMMAND PREVIEW TESTS: %d checks, %d failures" % [checks,failures]);quit(1 if failures else 0)
