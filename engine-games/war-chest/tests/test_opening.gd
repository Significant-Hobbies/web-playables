extends SceneTree
const Game=preload("res://scripts/opening_game.gd")
const Legacy=preload("res://scripts/journey_game.gd")
const Main=preload("res://scripts/pocket_main.gd")
const Art=preload("res://scripts/pocket_art.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok: failures+=1;push_error("FAIL: "+label)
func _init(): call_deferred("run")
func round_trip(g):
 var copy=Game.new()
 check(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))) and copy.snapshot()==g.snapshot(),"opening state round-trips exactly")
func fight(g):
 for turn in range(18):
  if g.battle.phase!="playing": return
  for hero in g.battle.heroes:
   if hero.hp<=0: continue
   for command in g.cards(hero.id):
    if Game.COMMANDS[command].target!="enemy": continue
    for foe in g.battle.enemies:
     if g.play(hero.id,command,foe.id): break
  for hero in g.battle.heroes:
   g.play(hero.id,"guard",hero.id)
  g.resolve()
func find_button(screen,label):
 for node in screen.hud.get_children():
  if node is Button and node.text==label: return node
 return null
func run():
 if "--pocket-demo" not in OS.get_cmdline_user_args(): quit(1);return
 var old=Legacy.new();old.begin(0);old.play("rowan","guard","rowan")
 var g=Game.new()
 check(g.restore(old.snapshot()) and g.snapshot()==old.snapshot() and not g.opening_guided(),"legacy active battle remains byte-equivalent and unenrolled")
 old.resolve();g.resolve();check(old.snapshot()==g.snapshot(),"legacy enemy resolution unchanged")
 g=Game.new();check(g.enroll_opening(),"fresh campaign enrolls")
 check(not g.campaign.items.has("cube") and not g.campaign.placements.has("cube"),"rune is earned, not already owned")
 check(not g.enroll_opening(),"enrollment cannot reset an existing opening")
 g.begin(0);round_trip(g)
 check(not g.enroll_opening(),"cannot enroll an active fight")
 var before=g.snapshot();check(not g.play("rowan","cleave","lysa") and g.snapshot()==before,"invalid commands keep opening atomic")
 fight(g)
 check(g.battle.phase=="victory" and g.opening_stage()==1,"legal first battle reaches earned-rune stage")
 check(g.campaign.items.has("cube") and not g.campaign.placements.has("cube"),"victory puts rune in storage for player packing")
 check(not g.has_loot() and g.war().banners.is_empty(),"first reward does not force unrelated banner system")
 before=g.snapshot();g.settle(true);check(g.snapshot()==before,"first reward remains at most once")
 round_trip(g);g.return_to_camp();round_trip(g)
 before=g.snapshot();check(not g.place("cube",0,0,0) and g.snapshot()==before,"overlap cannot teach packing or change state")
 check(g.place("cube",5,4,0) and g.opening_stage()==1,"unlinked packing does not claim a damage benefit")
 check(g.place("cube",1,0,0) and g.opening_stage()==2 and g.empowered("blade") and g.empowered("bow"),"edge adjacency can deliberately strengthen both weapons")
 round_trip(g);g.begin(1)
 var target=g.foe("enemy_1")
 var enhanced=g.damage_against("rowan","cleave",target)
 var layout=g.campaign.placements.duplicate(true);g.campaign.placements.erase("cube")
 check(g.damage_against("rowan","cleave",target)==enhanced-2,"rune payoff is real combat damage")
 g.campaign.placements=layout
 before=g.snapshot();g.play("rowan","cleave","enemy_1")
 check(g.campaign.opening.rune_used,"real linked attack records the payoff")
 g.restore(before);check(not g.campaign.opening.rune_used,"undo snapshot restores payoff discovery")
 fight(g)
 check(g.battle.phase=="victory" and g.opening_stage()==3,"earned second victory completes opening")
 check(g.has_loot(),"second victory introduces actual banner choices")
 round_trip(g)
 var saved=g.snapshot()
 for bad in [null,{},true,{"stage":-1,"skipped":false,"rune_used":false},{"stage":1.5,"skipped":false,"rune_used":false},{"stage":1,"skipped":"no","rune_used":false}]:
  var invalid=saved.duplicate(true);invalid.campaign.opening=bad
  check(not g.restore(invalid) and g.snapshot()==saved,"malformed opening extension rejected atomically")
 g=Game.new();g.enroll_opening();g.begin(0);g.retreat();g.return_to_camp()
 check(g.opening_stage()==0 and not g.campaign.items.has("cube"),"defeat preserves company without unearned rune")
 g.skip_opening();check(not g.opening_guided() and g.opening_stage()==0,"skip removes guidance, not earned progression")
 g.begin(0);fight(g);check(g.campaign.items.has("cube"),"skipping never forfeits first reward")
 var screen=Main.new();root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 # Legacy fixture mode stays available for existing isolated regression suites.
 check(screen.game.battle.is_empty() and not screen.game.campaign.has("opening"),"ordinary demo fixture does not silently change existing tests")
 screen.game.enroll_opening();screen.start_battle()
 check(screen.page=="battle" and screen.game.opening_stage()==0,"first surface is the actual defense")
 fight(screen.game);screen.show_page();await process_frame
 var next=find_button(screen,"Pack the storm rune  →")
 check(next!=null and not next.disabled,"first reward offers one clear packing action")
 if next!=null: next.pressed.emit()
 check(screen.page=="chest" and screen.gear=="cube" and screen.game.battle.is_empty(),"reward action opens actionable rune packing")
 check(Vector2i(1,0) in screen.chest.suggested,"native chest shows a legal edge-adjacent placement")
 check(screen.chest.position.y+350*screen.chest.scale.y<724,"chest fifth row stays above keyboard instructions")
 check(find_button(screen,"Pack a rune beside a weapon").disabled,"payoff button cannot imply a link before one exists")
 screen.chest.placed.emit("cube",1,0,0)
 check(screen.game.opening_stage()==2 and screen.game.empowered("blade"),"native packing commits the actual rule")
 find_button(screen,"Test this loadout  →").pressed.emit()
 check(screen.page=="battle" and screen.game.battle.mission==1 and screen.coach_hint().body.contains("+2"),"packing leads directly to real second battle with payoff hint")
 screen.choose_card("cleave");screen.on_actor("enemy_1")
 check(screen.game.campaign.opening.rune_used,"native attack discovers rune payoff")
 screen.undo_action();check(not screen.game.campaign.opening.rune_used,"native undo restores opening state")
 screen.chosen="";screen.game.ally("rowan").hp=0
 check(screen.coach_hint().body.contains("Lysa"),"rune coaching recovers to a living linked hero")
 screen.game.battle.commands=0
 check(screen.coach_hint().body.contains("End turn"),"rune coaching recovers when orders are exhausted")
 screen.game.ally("rowan").hp=26;screen.game.battle.commands=6;screen.show_page()
 screen.card_buttons[0].grab_focus();screen.card_buttons[0].pressed.emit()
 check(screen.get_viewport().gui_get_focus_owner().get_meta("focus_key","")=="command_cleave","keyboard command focus survives HUD rebuild")
 screen.game.battle.enemies[0].name="Frost marshal";screen.game.battle.enemies[0].boss=true;screen.show_page();await process_frame
 for actor in screen.actor_controls:
  check(actor.button.size==Vector2(108,140),"actual actor control does not grow with long names: "+actor.unit.name)
 # Geometry/atlas checks are not a native visual acceptance claim.
 var atlas=Art.COMPANY.get_image()
 check(atlas.get_pixel(0,0).a==0,"new adult-proportioned troop atlas has real alpha")
 for id in Art.SPRITES:
  var r=Art.SPRITES[id]
  check(Rect2(Vector2.ZERO,atlas.get_size()).encloses(r) and atlas.get_region(Rect2i(r)).get_used_rect().has_area(),"sprite crop contains artwork inside atlas: "+id)
 for unit in screen.game.battle.heroes+screen.game.battle.enemies:
  if unit.hp<=0: continue
  var enemy=unit.id.begins_with("enemy_")
  check(Rect2(130,210,1190,422).encloses(screen.field.unit_rect(unit,enemy)),"unit hit region stays in battlefield: "+unit.id)
 screen.game.new_campaign();screen.game.enroll_opening();screen.game.begin(0);fight(screen.game);screen.show_page()
 await process_frame
 for node in screen.hud.get_children():
  if node is Label or node is Button:
   check(Rect2(0,0,1440,900).encloses(node.get_rect()),"opening reward control stays on canvas: "+node.text.left(25))
 screen.queue_free();await process_frame;await process_frame
 print("OPENING TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
