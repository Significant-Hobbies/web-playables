extends SceneTree
const Game = preload("res://scripts/game.gd")
var checks=0
var errors=[]

func expect(ok: bool, description: String):
 checks+=1
 if not ok:
  errors.append(description)
  printerr("FAIL: "+description)

func _initialize():
 var g=Game.new()
 expect(g.validate_save(g.snapshot())=="","initial campaign validates")
 expect(not g.recruit(),"Merrin is locked before level two")
 expect(not g.upgrade("blade"),"forge rank is locked before level two")
 expect(not g.buy("ballista"),"ballista is locked before level three")
 g.campaign.xp=70
 g.campaign.gold=110
 expect(g.empowered("blade"),"starter rune buffs adjacent blade")
 expect(not g.can_place("bow",0,0,0),"packing rejects overlap")
 expect(not g.can_place("bow",5,4,0),"packing rejects edge overflow")
 expect(g.shape("blade",1).size()==4,"rotation preserves area")
 expect(g.place("bow",3,3,1),"rotated bow can fit")
 g.stow("cube")
 expect(not g.empowered("blade"),"stowing rune removes buff")
 var gold=g.campaign.gold
 expect(g.recruit(),"recruit Merrin")
 expect(g.campaign.gold==gold-60 and g.campaign.items.has("staff"),"recruit costs gold and grants staff")
 expect(not g.recruit(),"recruit cannot charge twice")
 var prepared=Game.new()
 prepared.campaign.xp=70
 prepared.campaign.gold=200
 expect(prepared.buy("staff") and prepared.upgrade("staff"),"staff can be acquired and forged before recruitment")
 expect(prepared.recruit() and prepared.campaign.items.staff==1,"recruitment preserves an already forged staff")
 expect(g.upgrade("blade"),"forge spends earned gold")
 expect(not g.buy("ballista"),"unaffordable purchase refused")
 expect(not g.start_mission(2),"locked mission refused")
 expect(g.start_mission(0),"mission starts")
 expect(g.validate_save(g.snapshot())=="","active battle validates")
 expect(not g.place("bow",3,3,0),"cannot repack during battle")
 expect(not g.buy("staff"),"cannot shop during battle")
 expect(not g.act("e0","move",[3,4]),"cannot command enemy")
 expect(not g.act("rowan","strike",[5,1]),"range enforced")
 expect(not g.act("rowan","move",[2,6]),"occupied destination refused")
 expect(g.act("rowan","move",[3,5]),"valid reachable movement")
 expect(g.get_unit("rowan").ap==1,"movement spends AP")
 expect(not g.act("rowan","cleave",[5,3]),"insufficient AP refused")
 expect(g.act("rowan","guard",[3,5]),"guard succeeds")
 expect(g.get_unit("rowan").shield==5 and g.get_unit("rowan").ap==0,"guard grants shield and consumes remaining orders")
 expect(not g.act("rowan","move",[3,4]),"exhausted actor refused")
 var intent=g.get_unit("e0").intent.duplicate(true)
 g.act("lysa","move",[4,6])
 expect(g.get_unit("e0").intent==intent,"player move does not secretly retarget enemy")
 expect(g.end_round(),"enemy round resolves")
 expect(g.get_unit("rowan").ap==2 and g.get_unit("rowan").shield==0,"round resets AP and shields")
 var copy=Game.new()
 expect(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"JSON round trip")
 expect(copy.snapshot()==g.snapshot(),"round trip preserves state exactly")
 var malformed=g.snapshot()
 malformed.battle.units[0].pos=[99,2]
 expect(not copy.restore(malformed),"bad position refused")
 malformed=g.snapshot()
 malformed.campaign.placements.blade=[5,4,0]
 expect(not copy.restore(malformed),"bad packing refused")
 malformed=g.snapshot()
 malformed.battle.units[0].hp="oops"
 expect(not copy.restore(malformed),"bad stat type refused")
 var intact=copy.snapshot()
 for bad_version in [false,"1",[],{}]:
  malformed=g.snapshot()
  malformed.version=bad_version
  expect(not copy.restore(malformed) and copy.snapshot()==intact,"wrong-type save version is rejected atomically")
 for bad_placement in [null,{},[],"broken",[0,0],[0,0,"oops"]]:
  malformed=g.snapshot()
  malformed.campaign.placements.cube=bad_placement
  expect(not copy.restore(malformed) and copy.snapshot()==intact,"malformed later placement is rejected atomically")
 DirAccess.make_dir_recursive_absolute("res://artifacts/test-saves")
 var path="res://artifacts/test-saves/test-save-"+str(Time.get_ticks_usec())+".json"
 expect(g.save_to(path),"isolated save written")
 var loaded=Game.new()
 expect(loaded.load_from(path),"save loaded")
 expect(g.snapshot()==loaded.snapshot(),"disk state exact")
 var bad_path=path+"-bad"
 var file=FileAccess.open(bad_path,FileAccess.WRITE)
 file.store_string("{broken")
 file.close()
 expect(not loaded.load_from(bad_path),"malformed save fails safely")
 expect(not loaded.save_to(bad_path),"malformed save cannot be overwritten")
 expect(FileAccess.get_file_as_string(bad_path)=="{broken","bad original preserved")
 var malformed_path=path+"-packing"
 malformed=g.snapshot()
 malformed.campaign.placements.cube=null
 var original=JSON.stringify(malformed)
 file=FileAccess.open(malformed_path,FileAccess.WRITE)
 file.store_string(original)
 file.close()
 var protected=Game.new()
 intact=protected.snapshot()
 expect(not protected.load_from(malformed_path) and protected.save_locked and protected.snapshot()==intact,"malformed packing locks saving without replacing campaign")
 expect(not protected.save_to(malformed_path) and FileAccess.get_file_as_string(malformed_path)==original,"malformed packing save bytes remain unchanged")
 var pre=g.campaign.gold
 g.finish(true)
 expect(g.campaign.gold==pre+85 and g.campaign.unlocked==1,"victory rewards and unlock")
 g.finish(true)
 expect(g.campaign.gold==pre+85,"victory reward idempotent")
 expect(not g.act("rowan","move",[3,4]),"finished battle cannot act")
 expect(g.return_to_camp(),"return to camp")
 expect(g.start_mission(1),"defense starts")
 g.battle.round=5
 for e in g.battle.units:
  if e.team=="enemy": e.intent={"kind":"stunned","target":e.pos}
 g.end_round()
 expect(g.battle.phase=="victory","surviving defense round five wins")
 g.return_to_camp()
 expect(g.level()>=2 and g.choose_talent("might"),"level unlocks talent")
 expect(not g.choose_talent("resolve"),"talent cannot be taken twice")
 g.start_mission(2)
 var before=g.campaign.duplicate(true)
 g.retreat()
 expect(g.battle.phase=="defeat" and g.campaign==before,"retreat preserves progression without rewards")
 var progression=Game.new()
 for i in range(Game.MISSIONS.size()):
  expect(progression.start_mission(i),"sequential route %d available" % i)
  var old_level=progression.level()
  progression.finish(true)
  expect(progression.level()==mini(old_level+1,Game.MAX_LEVEL),"victory grants full first-clear level")
  if progression.level()>old_level:
   expect(not Game.UNLOCKS[progression.level()].is_empty(),"every level has explicit content unlocks")
  if progression.level()==4: expect(progression.campaign.items.has("frost"),"level four grants Frostfang")
  progression.return_to_camp()
 expect(progression.choose_pet("owl"),"level six unlocks Talon")
 progression.start_mission(5)
 expect("rally" in progression.abilities("rowan"),"level five grants Rally")
 expect("gust" in progression.abilities("fen"),"owl grants ranged disruption")
 expect(progression.get_unit("fen").role=="owl","pet selection changes deployed unit")
 expect(progression.validate_save(progression.snapshot())=="","endgame state validates")
 print("RULE TESTS: %d checks, %d failures" % [checks,errors.size()])
 quit(0 if errors.is_empty() else 1)
