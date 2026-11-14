extends SceneTree
const Game=preload("res://scripts/hero_campaign.gd")
const Previous=preload("res://scripts/pocket_campaign.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok: failures+=1;print("FAIL: "+label)
func ready_game():
 var g=Game.new();g.campaign.xp=350;g.campaign.unlocked=5;g.campaign.mage=true
 g.campaign.items.staff=0;g.campaign.items.flask=0
 g.place("staff",4,2,0);g.place("flask",0,3,0)
 g.campaign.mastery={"rowan":5,"lysa":5,"fen":5,"merrin":5};g.begin(1)
 return g
func _init():
 var g=Game.new();var legacy=Previous.new();legacy.begin(0)
 check(g.restore(legacy.snapshot()),"previous active battle loads")
 check(g.battle==legacy.battle,"old battle stays exact")
 legacy.resolve();g.resolve();check(g.battle==legacy.battle,"old next turn stays exact")
 g.settle(true);check(g.campaign.mastery.is_empty(),"legacy battles do not invent mastery awards")
 g=ready_game()
 check(g.mastery_rank("rowan")==2,"rank snapshots at battle start")
 g.campaign.mastery.rowan=9;check(g.mastery_rank("rowan")==2,"active rank cannot change midway")
 check(g.rank_from_wins(1)==0 and g.rank_from_wins(2)==1 and g.rank_from_wins(4)==1 and g.rank_from_wins(5)==2 and g.rank_from_wins(9)==3,"rank thresholds")
 check(g.reposition("rowan",2),"Rowan moves beside pet")
 var shield=g.ally("fen").shield
 check(g.play("rowan","guard","rowan") and g.ally("fen").shield==shield+4,"Rowan protects same-front ally")
 check(g.ally("lysa").shield==0,"Rowan does not protect other front")
 var snapshot=g.snapshot()
 check(not g.play("rowan","guard","rowan") and g.snapshot()==snapshot,"repeated command cannot duplicate passive")
 g=ready_game();var e=g.battle.enemies[0];e.hp=100;e.max_hp=100;e.stunned=true
 var base=g.damage_for("lysa","volley");var hp=e.hp
 check(g.play("lysa","volley",e.id) and e.hp==hp-base-4,"Lysa exploits existing stun in real attack")
 g=ready_game();e=g.battle.enemies[0];e.hp=100;e.max_hp=100;hp=e.hp
 base=g.damage_for("lysa","volley")
 g.play("lysa","volley",e.id);check(e.hp==hp-base,"no Lysa bonus against unstunned foe")
 g=ready_game();g.ally("fen").hp=10;snapshot=g.snapshot()
 check(g.play("fen","strike",g.battle.enemies[2].id) and g.ally("fen").hp==14,"pet Strike heals itself")
 check(g.restore(snapshot) and g.ally("fen").hp==10,"undo restores passive healing")
 g.play("merrin","mend","lysa");check(g.ally("lysa").shield==4,"Merrin Heal adds block even at full HP")
 g=Game.new();g.campaign.xp=350;g.campaign.mastery.fen=5;g.choose_pet("owl");g.begin(0);g.ally("fen").hp=10
 check(g.play("fen","strike","enemy_3") and g.ally("fen").hp==14,"Talon shares companion mastery and healing")
 g=ready_game();g.assign_objective("control",30)
 g.play("merrin","spark","enemy_1")
 check(g.battle.objective.stunned.size()==1,"living stunned foe counts")
 g.resolve();g.play("merrin","spark","enemy_1")
 check(g.battle.objective.stunned.size()==1,"same foe cannot farm objective")
 g=ready_game();g.assign_objective("control",30)
 for enemy in g.battle.enemies: enemy.hp=100;enemy.max_hp=100
 g.play("merrin","spark","enemy_1");g.play("fen","pin","enemy_3")
 g.resolve();g.play("merrin","spark","enemy_4")
 check(g.objective_met() and g.battle.objective.stunned.size()==3,"three distinct living stuns fulfill objective")
 g.settle(true);check(g.battle.objective.paid,"control objective pays on victory")
 g=Game.new();g.campaign.xp=70;g.campaign.mastery.rowan=2
 check(g.begin_contract("raid",1) and g.mastery_rank("rowan")==1 and g.battle.objective.id=="swift","contract initializes mastery and correct objective")
 var expected_gold=g.encounter().gold+30;g.settle(true)
 check(g.battle.reward==expected_gold and g.campaign.mastery.rowan==3,"contract victory awards objective and mastery")
 g=ready_game();g.assign_objective("maneuver",30)
 g.reposition("rowan",2);g.reposition("lysa",0);g.reposition("fen",1)
 check(g.objective_met() and g.battle.objective.moved.size()==3,"three different repositioned heroes fulfill objective")
 var restored=Game.new()
 check(restored.restore(JSON.parse_string(JSON.stringify(g.snapshot()))) and restored.snapshot()==g.snapshot(),"progress and mastery roundtrip")
 g=Game.new();g.campaign.mastery={"rowan":1};g.begin(0)
 var gold=g.campaign.gold;g.settle(true)
 check(g.battle.objective.paid and g.campaign.gold==gold+85+20,"objective bonus added exactly")
 check(g.campaign.mastery.rowan==2 and g.campaign.mastery.lysa==1,"deployed heroes earn mastery independently")
 check(g.battle.mastery_awards==["Rowan: mastery I"],"rank up is reported")
 snapshot=g.snapshot();g.settle(true);check(g.snapshot()==snapshot,"repeated settlement grants nothing")
 check(restored.restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"rank up reward roundtrip")
 for goal in ["gate","company","swift"]:
  g=ready_game();g.assign_objective(goal,30)
  if goal=="gate": g.battle.gate=24
  if goal=="company": g.ally("fen").hp=0
  if goal=="swift": g.battle.round=6
  check(g.objective_text().contains("missed"),"failed objective is explained: "+goal)
  g.settle(true);check(not g.battle.objective.paid,"missed goal pays nothing: "+goal)
 g=ready_game();g.settle(false)
 check(g.campaign.mastery.rowan==5 and not g.battle.objective.paid,"loss gives no mastery or bonus")
 g=ready_game();g.ally("fen").hp=0;g.settle(true)
 check(g.campaign.mastery.fen==6,"fallen deployed hero still learns from team victory")
 g=Game.new();g.campaign.mastery.rowan=9;g.begin(0);g.settle(true)
 check(g.campaign.mastery.rowan==9,"mastery capped")
 for corruption in ["rank","wins","goal","paid","member","duplicate","missing","disabled_rules"]:
  g=ready_game();var broken=g.snapshot()
  match corruption:
   "rank": broken.battle.heroes[0].mastery=4
   "wins": broken.campaign.mastery.rowan=-1
   "goal": broken.battle.objective.id="unknown"
   "paid": broken.battle.objective.paid=true
   "member": broken.battle.objective.moved=["unknown"]
   "duplicate": broken.battle.objective.stunned=["enemy_1","enemy_1"]
   "missing": broken.battle.erase("objective")
   "disabled_rules": broken.battle.mastery_rules=false
  snapshot=restored.snapshot()
  check(not restored.restore(broken) and restored.snapshot()==snapshot,"invalid mastery save rejected atomically: "+corruption)
 print("MASTERY TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
