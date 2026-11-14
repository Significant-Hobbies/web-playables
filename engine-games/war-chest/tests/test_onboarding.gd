extends SceneTree
const Game=preload("res://scripts/hero_campaign.gd")
const Coach=preload("res://scripts/pocket_coach.gd")
const Main=preload("res://scripts/pocket_main.gd")
const Unlock=preload("res://scripts/pocket_unlock.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok: failures+=1;push_error("FAIL: "+label)
func _init(): call_deferred("run")
func run():
 if "--pocket-demo" not in OS.get_cmdline_user_args(): quit(1);return
 var g=Game.new();g.begin(0)
 check(g.campaign.lessons==0,"fresh campaign starts field lessons")
 check(Coach.hint(g,"rowan","").body.contains("Cleave"),"starter loadout offers a real useful attack")
 var before=g.snapshot()
 check(not g.play("rowan","strike","lysa") and g.snapshot()==before,"invalid orders never advance lessons")
 check(g.play("rowan","cleave","enemy_1") and g.campaign.lessons==Coach.ATTACK,"actual attack completes first lesson")
 check(Coach.hint(g,"rowan","").body.contains("Lysa"),"next lesson introduces cross-front support")
 check(g.play("lysa","volley","enemy_3") and g.campaign.lessons==3,"cross-front Volley completes ranged lesson")
 check(g.play("rowan","ward","lysa") and g.campaign.lessons==7,"ally protection also satisfies block lesson")
 check(Coach.hint(g,"rowan","").body.contains("End turn"),"last lesson explains enemy resolution")
 g.resolve()
 check(g.campaign.lessons==15 and Coach.hint(g,"rowan","").is_empty(),"lessons end after learning four actions")
 var copy=Game.new()
 check(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))) and copy.campaign.lessons==15,"lesson progress survives JSON save round-trip")
 var legacy=g.snapshot();legacy.campaign.erase("lessons")
 check(copy.restore(legacy) and copy.campaign.lessons==15,"old saves do not receive unsolicited lessons")
 for bad in [-1,16,1.5,"3",null,true]:
  var invalid=g.snapshot();invalid.campaign.lessons=bad;var untouched=copy.snapshot()
  check(not copy.restore(invalid) and copy.snapshot()==untouched,"invalid lesson state rejected atomically: "+str(bad))
 g=Game.new();g.begin(0);g.play("rowan","guard","rowan")
 check(g.campaign.lessons==Coach.BLOCK and Coach.hint(g,"rowan","").heading.contains("2/4"),"learning out of order remains supported")
 g.battle.commands=0
 check(Coach.hint(g,"rowan","").body.contains("No orders"),"zero-order advice never requests an unusable command")
 g=Game.new();g.begin(0);g.reposition("rowan",1)
 check(Coach.hint(g,"rowan","").body.contains("front 2"),"advice follows Rowan after movement")
 g=Game.new();g.stow("bow");g.begin(0);g.campaign.lessons=13
 check(Coach.hint(g,"rowan","").body.contains("stored"),"stored bow produces recovery advice rather than impossible Volley")
 g=Game.new();g.begin(0);g.campaign.lessons=13;g.ally("lysa").hp=0
 check(Coach.hint(g,"rowan","").body.contains("down"),"fallen archer does not trap ranged lesson")
 check(Coach.hint(g,"rowan","strike").body.contains("T to preview"),"target lesson teaches keyboard equivalent")
 for level in range(2,7):
  check(Coach.unlock_text(level)!="" and Coach.unlock_text(level).length()<205,"each level explains actionable unlocks compactly")
 # The teaching sequence earns an actual first victory, not a direct settle fixture.
 var screen=Main.new();root.add_child(screen);screen.muted=true;screen.start_battle()
 check(screen.coach_hint().heading.begins_with("Field lesson"),"native battle automatically shows coaching")
 screen.choose_card("cleave");var preview=screen.target_detail("enemy_1")
 check(preview.contains("10 damage") and preview.contains("every foe"),"mouse targeting previews actual multi-target attack")
 screen.on_actor("enemy_1")
 check(screen.inspection.text.contains("Lysa"),"successful action advances visible advice")
 screen.undo_action()
 check(screen.game.campaign.lessons==0,"undo restores lesson progress with the action")
 screen.choose_card("cleave");screen.on_actor("enemy_1")
 screen.select_hero("lysa");screen.choose_card("volley");screen.on_actor("enemy_3")
 screen.select_hero("rowan");screen.choose_card("ward");screen.on_actor("lysa")
 screen.resolve_turn()
 check(screen.coach_hint().is_empty(),"native teaching path completes without forcing any action")
 for i in range(3): screen.resolve_turn()
 check(screen.game.battle.phase=="victory" and screen.game.level()==2,"guided opening survives and earns first unlock")
 screen.finish_combat_animation()
 var seals=screen.hud.get_children().filter(func(n):return n.get_script()==Unlock)
 check(seals.size()==1 and seals[0].age==0,"first level-up starts one seal animation")
 seals[0]._process(1)
 check(seals[0].age==Unlock.DURATION,"unlock animation ends within budget")
 screen.show_page();seals=screen.hud.get_children().filter(func(n):return n.get_script()==Unlock)
 check(seals.size()==1 and seals[0].age==Unlock.DURATION,"reward inspection does not replay celebration")
 screen.game.claim_banner(screen.game.battle.loot[0]);screen.return_to_keep()
 check(screen.game.recruit() and screen.game.campaign.items.has("staff"),"first reward can buy the promised new hero and staff")
 check(not screen.game.campaign.placements.has("staff"),"unlock copy correctly says staff must be packed")
 check(screen.game.choose_talent("might"),"first permanent talent is usable after level-up")
 screen.game.begin(1)
 check("spark" not in screen.game.cards("merrin"),"unpacked unlocked equipment grants no phantom ability")
 screen.game.retreat();screen.game.return_to_camp()
 screen.game.place("staff",4,2,0);screen.game.begin(1);screen.selected="merrin";screen.chosen="spark"
 check(screen.target_detail("enemy_1").contains("cancels its next attack"),"target preview preserves tactical stun effect")
 screen.game.retreat();screen.game.return_to_camp();screen.game.new_campaign();screen.game.begin(0)
 screen.page="battle";screen.coaching=false;screen.show_page()
 check(screen.coach_hint().is_empty() and screen.card_buttons.size()==5,"skipping guidance keeps every legal command available")
 screen.coaching=true;screen.reduced_motion=true;screen.show_page();screen.select_hero("rowan");screen.choose_card("cleave");screen.on_actor("enemy_1")
 check(not screen.field.motion.active() and screen.inspection.text.contains("HP"),"reduced motion keeps attack outcomes ahead of coaching")
 var seal=Unlock.new();seal.reduced_motion=true;screen.add_child(seal)
 check(seal.age==Unlock.DURATION,"reduced motion reveals final unlock seal immediately")
 # Headless native layout checks catch text overflow, not visual polish.
 screen.reduced_motion=true;screen.unlock_seen=""
 for level in range(2,7):
  screen.game.new_campaign();screen.game.campaign.xp=(level-2)*70
  screen.game.begin(0);screen.game.settle(true);screen.show_page()
  await process_frame
  var descriptions=screen.hud.get_children().filter(func(n):return n is Label and n.text==Coach.unlock_text(level))
  check(descriptions.size()==1 and descriptions[0].size.y<=81,"level %d unlock copy fits its native text area" % level)
 screen.game.new_campaign();screen.game.begin(0);screen.show_page();await process_frame
 check(screen.inspection.size.y<=57,"first lesson fits the existing native footer")
 screen.queue_free();await process_frame;await process_frame
 print("ONBOARDING TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
