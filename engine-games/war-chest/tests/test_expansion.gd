extends SceneTree
const Game=preload("res://scripts/hero_campaign.gd")
const Legacy=preload("res://scripts/siege_game.gd")
var checks=0
var failures=0
func check(ok: bool,note: String):
 checks+=1
 if not ok: failures+=1;print("FAIL: "+note)
func claim_and_leave(g):
 if g.has_loot(): g.claim_banner(g.battle.loot[0])
 g.return_to_camp()
func _init():
 var g=Game.new()
 check(g.war()==g.war_defaults(),"new campaign has empty expansion state")
 var before=g.snapshot()
 check(not g.begin_contract("raid",1) and g.snapshot()==before,"contracts gated without mutation")
 var old=Legacy.new();old.begin(0);old.play("rowan","cleave","enemy_1")
 check(g.restore(old.snapshot()),"legacy active save loads")
 check(g.battle==old.battle and not g.battle.has("war_rules"),"legacy battle unchanged")
 var expected=Legacy.new();expected.restore(old.snapshot());expected.resolve();g.resolve()
 check(g.battle==expected.battle,"legacy next turn preserves enemy rules")
 g=Game.new();g.begin(0);g.settle(true)
 var pending=g.snapshot();var copy=Game.new()
 check(copy.restore(JSON.parse_string(JSON.stringify(pending))) and copy.snapshot()==pending,"pending draft survives save roundtrip")
 check(g.battle.loot.size()==3 and g.has_loot(),"victory offers three banners")
 g.return_to_camp()
 check(not g.battle.is_empty(),"cannot discard pending loot")
 before=g.snapshot()
 check(not g.claim_banner("unknown") and g.snapshot()==before,"invalid reward choice atomic")
 var reward=g.battle.loot[0]
 check(g.claim_banner(reward),"claim one banner")
 before=g.snapshot()
 check(not g.claim_banner(reward) and g.snapshot()==before,"banner reward cannot double-claim")
 g.settle(true)
 check(g.snapshot()==before,"settlement remains idempotent")
 g.return_to_camp()
 check(g.war().equipped==reward,"first reward auto-equipped")
 before=g.snapshot()
 check(not g.equip_banner("unknown") and g.snapshot()==before,"unowned banner rejected")
 check(g.begin(1),"second mission opens")
 var armored={};var archer={}
 for e in g.battle.enemies:
  if e.trait=="armored": armored=e
  if e.trait=="archer": archer=e
 check(not armored.is_empty() and not archer.is_empty(),"campaign introduces enemy roles")
 var hp=armored.hp;g.hurt_foe(armored,5)
 check(armored.hp==hp-3,"armor blocks two per hit")
 hp=armored.hp;g.hurt_foe(armored,1)
 check(armored.hp==hp-1,"armor allows minimum one damage")
 g.ally("fen").hp=2;g.plan()
 check(archer.target=="fen","archer selects weakest across fronts")
 g.retreat();claim_and_leave(g)
 before=g.snapshot()
 check(not g.begin_contract("raid",2) and g.snapshot()==before,"locked contract tier is atomic")
 var wins=g.campaign.wins.duplicate();var unlocked=g.campaign.unlocked
 check(g.begin_contract("siege",1),"contract starts")
 var sapper={}
 for e in g.battle.enemies:
  if e.trait=="sapper": sapper=e
 check(not sapper.is_empty() and sapper.target=="gate","sapper bypasses troop formation")
 for e in g.battle.enemies:
  if e.id!=sapper.id: e.stunned=true
 var gate=g.battle.gate;var damage=g.attack_power(sapper)
 g.resolve()
 check(g.battle.gate==gate-damage,"displayed sapper damage reaches gate")
 g.settle(true)
 check(g.campaign.wins==wins and g.campaign.unlocked==unlocked,"contracts do not clear campaign missions")
 check(g.war().renown==1 and g.war().contracts==1,"contract grants renown once")
 before=g.snapshot();g.settle(true)
 check(g.snapshot()==before,"contract reward cannot duplicate")
 claim_and_leave(g)
 g.war().banners={"ember":3,"hunt":2,"stone":2,"life":2,"storm":2,"fortune":3}
 check(g.equip_banner("ember") and g.begin(0),"owned banner equips")
 check(g.damage_for("rowan","strike")==9,"ember increases melee only")
 check(g.damage_for("lysa","volley")==11,"ember does not increase rune-linked ranged attacks")
 before=g.snapshot()
 check(not g.equip_banner("hunt") and g.snapshot()==before,"banner cannot switch midbattle")
 g.retreat();claim_and_leave(g);g.equip_banner("stone");g.begin(0)
 check(g.ally("rowan").shield==4,"stoneguard initial turn block")
 g.resolve();check(g.ally("rowan").shield==4,"stoneguard replenishes each new turn")
 g.retreat();claim_and_leave(g);g.equip_banner("fortune");g.begin_contract("raid",1)
 var contract_gold=g.encounter().gold;g.settle(true)
 check(g.battle.reward==contract_gold+30+(g.battle.objective.gold if g.battle.objective.paid else 0),"fortune changes actual victory gold")
 var choice=g.battle.loot[0];g.war().banners[choice]=3;var gold=g.campaign.gold
 g.claim_banner(choice)
 check(g.campaign.gold==gold+40 and g.war().banners[choice]==3,"mastered duplicate converts to gold")
 claim_and_leave(g)
 for spec in [["hunt","lysa","volley",2],["life","rowan","mend",4],["storm","rowan","spark",2]]:
  g.equip_banner("");var baseline=g.damage_for(spec[1],spec[2]);g.equip_banner(spec[0])
  check(g.damage_for(spec[1],spec[2])==baseline+spec[3],"banner effect: "+spec[0])
 g.war().renown=5;check(g.max_tier()==1,"tier stays locked before threshold")
 g.war().renown=6;check(g.max_tier()==2,"six renown opens tier two")
 var captain={"trait":"captain","power":5,"hp":11,"max_hp":20}
 check(g.attack_power(captain)==5,"captain starts at normal attack")
 captain.hp=10;check(g.attack_power(captain)==7,"captain enrages at half health")
 for corruption in ["rank","equipped","contract","loot","trait","message"]:
  var broken=g.snapshot()
  if corruption=="rank": broken.campaign.war.banners.ember=4
  elif corruption=="equipped": broken.campaign.war.equipped="unknown"
  else:
   var fixture=Game.new();fixture.campaign.xp=70;fixture.begin_contract("elite",1);broken=fixture.snapshot()
   if corruption=="contract": broken.battle.contract.tier=99
   if corruption=="loot": broken.battle.loot=["ember","ember","ember"]
   if corruption=="trait": broken.battle.enemies[0].trait="unknown"
   if corruption=="message": broken.battle.claim_message={}
  before=copy.snapshot()
  check(not copy.restore(broken) and copy.snapshot()==before,"malformed expansion rejected atomically: "+corruption)
 DirAccess.make_dir_recursive_absolute("res://artifacts/test-saves")
 var protected="res://artifacts/test-saves/pocket-expansion-broken-%d.json" % OS.get_process_id()
 var f=FileAccess.open(protected,FileAccess.WRITE);f.store_string("{broken");f.close()
 check(not copy.load_from(protected) and not copy.save_to(protected),"malformed file remains protected")
 check(FileAccess.get_file_as_string(protected)=="{broken","malformed original bytes retained")
 # New contracts are reachable with the actual level-two starter company.
 for id in Game.CONTRACTS:
  var early=Game.new();early.begin(0);auto_battle(early);claim_and_leave(early)
  check(early.begin_contract(id,1),"early contract opens: "+id)
  auto_battle(early)
  check(early.battle.phase=="victory","starter company can win tier-one "+id)
 # Play each campaign encounter with actual commands; banners/equipment persist.
 g=Game.new()
 for mission in range(6):
  if mission==1: g.recruit();g.place("staff",4,2,0);g.choose_talent("might")
  if mission==2: g.buy("ballista");g.place("ballista",0,3,0)
  if mission==3: g.place("frost",2,3,1)
  while g.campaign.items.blade<g.forge_limit() and g.campaign.gold>=30+g.campaign.items.blade*25: g.upgrade("blade")
  check(g.begin(mission),"expanded campaign begins %d" % mission)
  auto_battle(g)
  check(g.battle.phase=="victory","expanded campaign win %d" % mission)
  check(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"expanded campaign save validates")
  print("EXPANSION MISSION %d: %s · gate %d" % [mission+1,g.battle.phase,g.battle.gate])
  claim_and_leave(g)
 # Each template and tier is winnable with a prepared endgame company.
 g.war().renown=24;g.war().banners.stone=3;g.equip_banner("stone")
 for tier in range(1,6):
  for id in Game.CONTRACTS:
   check(g.begin_contract(id,tier),"contract begins %s %d" % [id,tier])
   auto_battle(g)
   print("CONTRACT %s T%d: %s · gate %d" % [id,tier,g.battle.phase,g.battle.gate])
   if g.battle.phase!="victory":
    print("DEFEAT HEROES: ",g.battle.heroes)
    print("DEFEAT LOG: ",g.battle.log)
   check(g.battle.phase=="victory","contract win %s %d" % [id,tier])
   check(copy.restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"contract result roundtrip")
   claim_and_leave(g)
 print("EXPANSION TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)

func auto_battle(g):
 var turns=0
 while g.battle.phase=="playing" and turns<40:
  turns+=1
  for step in range(20):
   var best={};var best_score=0.0
   for h in g.battle.heroes:
    if h.hp<=0: continue
    for card in g.cards(h.id):
     if g.reason(h.id,card)!="": continue
     var d=Game.COMMANDS[card]
     var targets=g.battle.enemies if d.target=="enemy" else g.battle.heroes
     for t in targets:
      if t.hp<=0 or g.reason(h.id,card,t.id)!="": continue
      var score=0.0
      if d.target=="enemy":
       var victims=[]
       if card=="cleave":
        for e in g.battle.enemies:
         if e.hp>0 and e.lane==h.lane: victims.append(e)
       else: victims=[t]
       for e in victims:
        var hit=g.damage_for(h.id,card)-(2 if e.get("trait","")=="armored" else 0)
        if card=="gust": hit=0
        score+=mini(e.hp,maxi(0,hit))
        if hit>=e.hp: score+=8+(8 if e.target=="gate" else 0)
        elif card in ["spark","pin","frost","gust"] and not e.stunned:
         var avoided=g.attack_power(e) if e.target=="gate" else maxi(0,g.attack_power(e)-int(g.ally(e.target).get("shield",0)))
         score+=avoided*(3.0 if e.target=="gate" else 1.5)
      elif card=="mend": score=minf(t.max_hp-t.hp,g.damage_for(h.id,card))*0.9
      elif card=="rally": score=2.0
      else:
       if d.target=="self" and t.id!=h.id: continue
       var threat=0
       for e in g.battle.enemies:
        if e.hp>0 and not e.stunned and e.target==t.id: threat+=g.attack_power(e)
       score=minf(maxi(0,threat-t.shield),6 if card=="guard" else 8)*0.7
      score/=d.cost
      if score>best_score: best_score=score;best={"actor":h.id,"card":card,"target":t.id}
   if best.is_empty(): break
   g.play(best.actor,best.card,best.target)
   if g.battle.phase!="playing": break
  if g.battle.phase=="playing": g.resolve()
