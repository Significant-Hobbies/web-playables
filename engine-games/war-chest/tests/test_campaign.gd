extends SceneTree
const Game=preload("res://scripts/game.gd")
var game=Game.new()
var failures=[]

func _initialize():
 for mission in range(Game.MISSIONS.size()):
  prepare()
  if not game.start_mission(mission):
   failures.append("Cannot start %d: %s" % [mission,game.message])
   break
  var rounds=0
  while game.battle.phase=="playing" and rounds<50:
   for unit in game.battle.units.duplicate():
    if unit.team!="ally" or unit.hp<=0: continue
    var orders=0
    while unit.ap>0 and game.battle.phase=="playing" and orders<6:
     orders+=1
     play_best_order(unit)
   if game.battle.phase=="playing": game.end_round()
   rounds+=1
   var save=Game.new()
   if not save.restore(JSON.parse_string(JSON.stringify(game.snapshot()))):
    failures.append("Invalid campaign save: "+save.message)
    break
  print("CAMPAIGN %d: %s after %d rounds; level %d; gold %d" % [mission+1,game.battle.phase,rounds,game.level(),game.campaign.gold])
  if game.battle.phase!="victory":
   failures.append("Mission %d not won by deterministic baseline strategy" % (mission+1))
   break
  game.return_to_camp()
 print("CAMPAIGN TEST: %d failures" % failures.size())
 for f in failures: printerr(f)
 quit(0 if failures.is_empty() else 1)

func prepare():
 if game.level()>=2 and not game.campaign.mage: game.recruit()
 if game.level()>=2 and game.campaign.talent=="":game.choose_talent("might")
 if game.level()>=3:
  for id in ["flask","ballista"]:
   if not game.campaign.items.has(id):game.buy(id)
 for id in ["blade","bow","staff"]:
  if game.campaign.items.has(id):game.upgrade(id)
 for id in game.campaign.items:
  if game.campaign.placements.has(id):continue
  var done=false
  for r in range(4):
   for y in range(5):
    for x in range(6):
     if not done and game.can_place(id,x,y,r):
      game.place(id,x,y,r)
      done=true

func play_best_order(u):
 var best={}
 var score=-1.0
 for ability in game.abilities(u.id):
  if ability in ["move","guard","rally"]: continue
  var info=game.ability_info(ability,u.id)
  for target in game.battle.units:
   if target.hp<=0 or game.action_error(u.id,ability,target.pos)!="":continue
   var value=float(info.damage)/info.cost
   if target.team=="enemy":
    if info.damage>=target.hp:value+=7
    if ability in ["pin","frost","gust"] and target.intent.kind in ["attack","siege"]:value+=5
    if ability=="cleave":
     for other in game.battle.units:
      if other.team=="enemy" and other.hp>0 and other.id!=target.id and game.distance(u.pos,other.pos)<=1:value+=5
   elif ability=="mend":value=8.0 if target.hp<target.max_hp*0.6 else -1.0
   else:value=-1.0
   if value>score:
    score=value
    best={"ability":ability,"target":target.pos.duplicate()}
 if not best.is_empty():
  game.act(u.id,best.ability,best.target)
  return
 var enemies=game.battle.units.filter(func(e):return e.team=="enemy" and e.hp>0)
 var old=999
 for e in enemies:old=mini(old,game.distance(u.pos,e.pos))
 var best_cell=[]
 var distance=old
 if "move" in game.abilities(u.id):
  for p in game.reachable(u,3):
   for e in enemies:
    var d=game.distance(p,e.pos)
    if d<distance:
     best_cell=p
     distance=d
 if not best_cell.is_empty() and game.act(u.id,"move",best_cell):return
 game.act(u.id,"guard",u.pos)
