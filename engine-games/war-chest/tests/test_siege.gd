extends SceneTree
const Game=preload("res://scripts/siege_game.gd")
var failures=0
var checks=0
func check(ok: bool,note: String):
 checks+=1
 if not ok:
  failures+=1
  print("FAIL: "+note)

func _init():
 var g=Game.new()
 check(g.begin(0),"first siege starts")
 check(g.battle.heroes.size()==3 and g.battle.enemies.size()==5,"three founding fronts under pressure")
 check(g.empowered("blade"),"starter rune adjacency")
 check(g.damage_for("rowan","cleave")==10,"rune damage")
 var before=g.snapshot()
 check(not g.play("rowan","cleave","enemy_2"),"melee wrong front rejected")
 check(g.snapshot()==before,"invalid play atomic")
 check(not g.play("rowan","unknown","enemy_1"),"unknown card rejected")
 check(g.play("rowan","cleave","enemy_1"),"cleave works")
 check(g.foe("enemy_1").hp==0 and g.battle.commands==4,"damage and cost")
 before=g.snapshot()
 check(not g.play("rowan","cleave","enemy_1") and g.snapshot()==before,"used command atomic")
 check(g.reposition("rowan",1),"reposition works")
 check(g.foe("enemy_2").target=="rowan","reposition updates intents")
 check(not g.reposition("rowan",2),"reposition limit")
 check(g.play("rowan","ward","rowan"),"shield ally")
 var hp=g.ally("rowan").hp
 check(g.resolve(),"resolve turn")
 check(g.ally("rowan").hp==hp,"block absorbs damage")
 check(g.ally("rowan").shield==0 and g.battle.commands==6,"round resets")
 var copy=Game.new()
 check(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"active save roundtrip")
 check(copy.snapshot()==g.snapshot(),"roundtrip exact")
 var broken=g.snapshot()
 broken.battle.enemies[0].target="missing"
 before=copy.snapshot()
 check(not copy.restore(broken) and copy.snapshot()==before,"invalid restore atomic")
 broken=g.snapshot()
 broken.battle.heroes[0].hp=-1
 check(not copy.restore(broken),"invalid health rejected")
 for bad_type in [false,"2",[],{},-1,1.5]:
  broken=g.snapshot()
  broken.version=bad_type
  before=copy.snapshot()
  check(not copy.restore(broken) and copy.snapshot()==before,"wrong-type siege version rejected atomically")
  broken=g.snapshot()
  broken.battle.enemies[0].target=bad_type
  check(not copy.restore(broken) and copy.snapshot()==before,"wrong-type enemy target rejected atomically")
 DirAccess.make_dir_recursive_absolute("res://artifacts/test-saves")
 var path="res://artifacts/test-saves/siege-test-%d.json" % OS.get_process_id()
 check(g.save_to(path),"save file")
 check(copy.load_from(path),"load file")
 check(copy.snapshot()==g.snapshot(),"file roundtrip exact")
 var malformed="res://artifacts/test-saves/siege-broken-%d.json" % OS.get_process_id()
 var f=FileAccess.open(malformed,FileAccess.WRITE)
 f.store_string("{broken");f.close()
 check(not copy.load_from(malformed) and copy.save_locked,"malformed locks writes")
 check(not copy.save_to(malformed),"malformed save cannot be overwritten")
 check(FileAccess.get_file_as_string(malformed)=="{broken","original preserved")
 var target_path=path+"-bad-target"
 broken=g.snapshot()
 broken.battle.enemies[0].target=false
 var original=JSON.stringify(broken)
 f=FileAccess.open(target_path,FileAccess.WRITE)
 f.store_string(original);f.close()
 var protected=Game.new()
 before=protected.snapshot()
 check(not protected.load_from(target_path) and protected.save_locked and protected.snapshot()==before,"schema-invalid target protects file and current state")
 check(not protected.save_to(target_path) and FileAccess.get_file_as_string(target_path)==original,"schema-invalid original bytes retained")
 g.retreat()
 var gold=g.campaign.gold
 g.settle(true)
 check(g.campaign.gold==gold,"defeat cannot be rewarded again")
 g.return_to_camp()
 g.stow("blade")
 check("cleave" not in g.cards("rowan"),"unpacking removes command")
 check(g.place("blade",0,0,0),"repack restores gear")
 check("cleave" in g.cards("rowan"),"packing restores command")
 # Replayable legal-action campaign bot: target damaging gear first, then basic strikes.
 g=Game.new()
 for mission in range(6):
  if mission==1:
   check(g.recruit(),"level two recruitment")
   check(g.place("staff",4,2,0),"mage gear packed")
  if mission>=1 and g.campaign.gold>=30 and g.campaign.items.blade<g.forge_limit(): g.upgrade("blade")
  if mission==2:
   check(g.buy("ballista"),"level three siege kit purchase")
   check(g.place("ballista",0,3,0),"ballista fits chest")
  if mission==3: check(g.place("frost",2,3,1),"level four relic fits")
  check(g.begin(mission),"campaign battle starts %d" % mission)
  var rounds=0
  while g.battle.phase=="playing" and rounds<40:
   rounds+=1
   for h in g.battle.heroes:
    if h.hp<=0: continue
    for card in g.cards(h.id):
     if card in ["guard","ward","mend"]: continue
     if card=="rally":
      if g.reason(h.id,card)=="": g.play(h.id,card,h.id)
      continue
     for e in g.battle.enemies:
      if e.hp>0 and g.reason(h.id,card,e.id)=="":
       g.play(h.id,card,e.id)
       break
   if g.battle.phase=="playing": g.resolve()
   copy=Game.new()
   check(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"campaign save valid")
  print("SIEGE %d: %s in %d rounds; gate %d" % [mission+1,g.battle.phase,rounds,g.battle.gate])
  check(g.battle.phase=="victory","campaign victory %d" % mission)
  var reward=g.campaign.gold
  g.settle(true)
  check(g.campaign.gold==reward,"reward idempotent")
  check(g.level()==mini(6,mission+2),"level unlock cadence")
  if g.battle.phase=="playing": g.retreat()
  g.return_to_camp()
 print("SIEGE TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
