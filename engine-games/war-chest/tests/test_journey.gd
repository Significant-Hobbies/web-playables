extends SceneTree
const Game=preload("res://scripts/journey_game.gd")
const Previous=preload("res://scripts/hero_campaign.gd")
const Motion=preload("res://scripts/pocket_motion.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok: failures+=1;push_error("FAIL: "+label)
func _init(): call_deferred("run")

func run():
 var g=Game.new();var before=g.snapshot()
 check(not g.begin_quest("scout") and g.snapshot()==before,"first story requires actual campaign victory")
 check(not g.begin_quest("bad") and g.snapshot()==before,"unknown quest is atomic")
 check(not g.buy("pennant") and g.snapshot()==before,"unique relic cannot be bought for zero gold")
 var legacy=Previous.new();legacy.campaign.xp=210;legacy.campaign.unlocked=3;legacy.begin(3)
 check(g.restore(legacy.snapshot()) and g.hazard().is_empty(),"legacy active battle gets no new hazard")
 legacy.resolve();g.resolve();check(legacy.battle==g.battle,"legacy next enemy turn remains identical")
 var contents=0
 for id in Game.ITEMS: contents+=Game.ITEMS[id].shape.size()
 check(contents==43 and contents>30,"equipment selection exceeds capacity by 13 cells")
 g=fixture();g.campaign.items.pennant=0;g.place("pennant",4,2,0);g.begin(0)
 g.battle.commands=0;before=g.snapshot()
 check(not g.reposition("rowan",0) and g.snapshot()==before,"invalid free move is atomic even at zero orders")
 check(g.reposition("rowan",2) and g.battle.commands==0 and g.battle.march_used,"first move really is free at zero orders")
 check(not g.reposition("lysa",0),"second company move requires orders")
 g.resolve();check(g.free_march(),"pennant refreshes next turn")
 g=fixture();g.campaign.items.aegis=0;g.place("aegis",3,3,0);g.begin(0);g.play("rowan","guard","rowan")
 check(g.ally("rowan").shield==10,"packed aegis makes Guard 10 block")
 g=fixture();g.campaign.items.lens=0;g.place("lens",3,3,0);g.begin(0)
 var e=g.foe("enemy_1");var baseline=g.damage_against("lysa","volley",e)
 g.foe("enemy_2").hp=0
 check(g.damage_against("lysa","volley",e)==baseline+3,"lens rewards clearing the shooter's own front")
 g=fixture();g.begin(2);g.play("rowan","guard","rowan");var hp=g.ally("rowan").hp
 check(g.hazard().lane==0 and g.hazard().damage==9,"next bombardment is deterministic and readable")
 g.before_enemy_turn();check(g.ally("rowan").hp==hp-3 and g.ally("rowan").shield==0,"bombardment consumes block before health")
 check(g.ally("lysa").hp==g.ally("lysa").max_hp,"other fronts are safe from current bombardment")
 g=fixture();g.begin(2);g.ally("rowan").hp=1;g.ally("rowan").shield=6
 before=g.battle.duplicate(true);g.resolve()
 before.motion_attack_state=g.resolution_start;before.motion_absorbed=g.hazard_absorbed;before.motion_enemy_turn=g.enemy_turn_started
 var motion=Motion.new();motion.build(before,g.battle,"","",true)
 check(g.ally("rowan").hp==0 and g.resolution_start.rowan.hp==0,"hazard defeats hero before fixed enemy attacks")
 var rowan_at=Motion.point(before.heroes[0],false,before)
 check(motion.effects.filter(func(fx):return fx.kind=="enemy" and fx.at==rowan_at).is_empty(),"no phantom attack on hazard-defeated hero")
 check(motion.summary.contains("Rowan blocked 6"),"hazard block retains exact motion feedback")
 g=fixture();g.campaign.journey.completed=["scout"];g.begin_quest("convoy");g.reposition("rowan",2);g.battle.gate=5
 before=g.battle.duplicate(true);g.resolve()
 before.motion_attack_state=g.resolution_start;before.motion_absorbed=g.hazard_absorbed;before.motion_enemy_turn=g.enemy_turn_started
 motion.build(before,g.battle,"","",true)
 check(g.battle.phase=="defeat" and not g.enemy_turn_started,"missed escort can end battle before enemy phase")
 check(g.battle.quest_failure.contains("gate fell"),"escort gate failure gives a concrete cause")
 check(motion.effects.filter(func(fx):return fx.kind=="enemy").is_empty(),"pre-enemy defeat produces no invented attacks")
 g=fixture();g.begin_quest("scout");g.reposition("rowan",2);g.resolve()
 check(g.battle.quest.progress==1,"scout collection is an actual survived move")
 before=g.snapshot();g.reposition("rowan",0);g.resolve()
 check(g.battle.phase=="victory" and g.quest_done("scout") and g.campaign.items.has("pennant"),"rescue grants unique relic")
 var won=g.snapshot();g.settle(true);check(g.snapshot()==won,"quest settlement is at most once")
 var copy=Game.new();check(copy.restore(JSON.parse_string(JSON.stringify(won))) and copy.snapshot()==won,"pending quest reward round-trips exactly")
 check(copy.restore(before) and copy.battle.quest.progress==1,"active rescue round-trips")
 var campaign_wins=g.campaign.wins.duplicate();leave(g);g.begin_quest("scout");var xp=g.campaign.xp
 g.reposition("rowan",2);g.resolve();g.reposition("rowan",0);g.resolve()
 check(g.battle.reward<90+25 and g.campaign.xp==xp and g.campaign.journey.completed.size()==1,"replay cannot farm first-clear rewards or XP")
 check(g.campaign.wins==campaign_wins,"quests never mark campaign missions cleared")
 leave(g);g.begin_quest("convoy");g.reposition("rowan",2);var gate=g.battle.gate;g.before_enemy_turn()
 check(g.battle.gate==gate-5 and g.battle.quest.pending==0,"missing the cart escort costs gate health")
 g=fixture();g.begin_quest("relic");g.play("fen","guard","fen");g.resolve()
 check(g.battle.quest.progress==1,"shielded survivor charges relic")
 g=fixture();g.begin_quest("relic");g.resolve()
 check(g.battle.quest.progress==0,"unprotected occupancy does not charge relic")
 g=fixture();g.campaign.journey.completed=["relic"];g.begin_quest("beacons");g.reposition("rowan",2);g.resolve()
 check(g.battle.quest.progress==4,"arriving survivor lights destination beacon")
 g=fixture();g.begin_quest("scout");g.ally("rowan").hp=1;g.resolve()
 check(g.battle.phase=="defeat" and not g.quest_done("scout"),"fallen escort fails rescue even with other survivors")
 check(g.battle.quest_failure.contains("Rowan fell"),"rescue loss explains fallen escort")
 g=fixture();g.begin_quest("relic");g.ally("fen").hp=1;g.ally("fen").shield=1;g.resolve()
 check(g.ally("fen").hp==0 and g.battle.quest.progress==0,"fallen shield carrier grants no relic charge")
 g=fixture();g.campaign.journey.completed=["relic"];g.begin_quest("beacons");g.reposition("rowan",2);g.ally("rowan").hp=1
 g.foe("enemy_3").target="rowan";g.resolve()
 check(g.ally("rowan").hp==0 and g.battle.quest.progress==0,"fallen arriving hero does not light beacon")
 g=fixture();g.begin_quest("scout");g.battle.round=5;g.resolve()
 check(g.battle.phase=="defeat" and not g.quest_done("scout"),"quest deadline cannot become a generic defense victory")
 check(g.battle.quest_failure.contains("Time ran out"),"quest timeout explains missed objective")
 check(Game.new().restore(JSON.parse_string(JSON.stringify(g.snapshot()))),"specific quest defeat round-trips")
 g=fixture();g.begin_quest("scout");g.retreat()
 check(g.battle.quest_failure.contains("withdrew"),"voluntary retreat is not described as a failed objective")
 g=fixture();g.campaign.journey.completed=["citadel"];g.begin_quest("engine")
 var boss=g.battle.enemies.filter(func(e):return e.boss)[0]
 var protected=g.damage_against("lysa","volley",boss)
 for enemy in g.battle.enemies:
  if not enemy.boss: enemy.hp=0
 check(g.damage_against("lysa","volley",boss)==protected+4,"destroying escorts removes commander protection")
 for id in ["convoy","beacons","citadel","engine"]:
  g.campaign.journey.completed=[id]
  check(g.max_tier()=={"convoy":2,"beacons":3,"citadel":4,"engine":5}[id],"quest milestone bypasses renown gate: "+id)
 g=fixture();g.begin_quest("scout");before=g.snapshot()
 for key in ["completed","progress","pending","relics","flag","mixed","mission","chain"]:
  var bad=before.duplicate(true)
  match key:
   "completed": bad.campaign.journey.completed=["unknown"]
   "progress": bad.battle.quest.progress=-1
   "pending": bad.battle.quest.pending="x"
   "relics": bad.battle.relics=["fake"]
   "flag": bad.battle.journey_rules=false
   "mixed": bad.battle.contract={"id":"raid","tier":1,"rotation":0}
   "mission": bad.battle.mission=5
   "chain": bad.campaign.journey.completed=["convoy"]
  var prior=copy.snapshot()
  check(not copy.restore(bad) and copy.snapshot()==prior,"malformed journey rejected atomically: "+key)
 # Full earned journey, no fixture resources or direct settlement.
 var path=Game.new();var schedule={0:["scout","convoy"],1:["relic"],2:["beacons"],3:["citadel"],5:["engine"]}
 var victories=0;var decisions={}
 for mission in range(6):
  prepare(path)
  check(path.begin(mission),"campaign begins along earned route %d" % mission)
  fight(path,true,decisions)
  print("JOURNEY CAMPAIGN ",mission+1," ",path.battle.phase," gate=",path.battle.gate)
  check(path.battle.phase=="victory","tactical campaign victory %d" % mission)
  if path.battle.phase!="victory": break
  victories+=1;leave(path)
  for id in schedule.get(mission,[]):
   prepare(path);check(path.begin_quest(id),"quest opens through actual story milestone: "+id)
   fight(path,true,decisions)
   print("JOURNEY QUEST ",id," ",path.battle.phase," progress=",path.battle.quest.progress," gate=",path.battle.gate)
   check(path.battle.phase=="victory","authored quest winnable: "+id)
   if path.battle.phase!="victory": path.retreat();leave(path);continue
   victories+=1;leave(path)
 check(victories==12 and path.campaign.journey.completed.size()==6,"all twelve authored missions playable on earned progression")
 check(path.max_tier()==5 and path.war().contracts==0,"full story opens endgame without contract grinding")
 check(path.campaign.items.has_all(Game.RELICS),"all three unique loadout options earned")
 for id in ["scout","convoy","relic","beacons"]:
  var rush=fixture();rush.campaign.journey.completed=["scout","relic"]
  rush.begin_quest(id);var rushing={};fight(rush,false,rushing)
  check(rush.battle.phase=="defeat","fixture attack-only policy misses required objective: "+id)
 # Compare the same earned main campaign without movement/protection/healing.
 var rush_campaign=Game.new();var rush_clears=0;var rush_actions={}
 for mission in range(6):
  prepare(rush_campaign);rush_campaign.begin(mission);fight(rush_campaign,false,rush_actions)
  print("JOURNEY ATTACK_ONLY ",mission+1," ",rush_campaign.battle.phase," gate=",rush_campaign.battle.gate)
  if rush_campaign.battle.phase!="victory":break
  rush_clears+=1;leave(rush_campaign)
 print("JOURNEY ATTACK_ONLY CLEARS ",rush_clears,"/6")
 print("JOURNEY TACTICAL DECISIONS ",decisions)
 print("JOURNEY TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)

func fixture():
 var g=Game.new();g.campaign.xp=350;g.campaign.unlocked=5;g.campaign.wins=[1,1,1,1,1,1]
 return g
func leave(g):
 if g.has_loot():
  var id="stone" if "stone" in g.battle.loot else g.battle.loot[0]
  g.claim_banner(id)
 g.return_to_camp()
 if g.war().banners.has("stone"):g.equip_banner("stone")
func prepare(g):
 if g.level()>=2:
  if not g.campaign.mage:g.recruit();g.place("staff",4,2,0)
  if g.campaign.talent=="":g.choose_talent("might")
 for id in ["blade","bow","staff","ward"]:
  if g.campaign.items.has(id) and g.campaign.items[id]<g.forge_limit():g.upgrade(id)
 # Keep a maneuver-friendly company: leave ballista out of this build.
 if g.level()>=3 and not g.campaign.items.has("flask"):g.buy("flask");g.place("flask",0,3,0)
 if g.campaign.items.has("frost") and not g.campaign.placements.has("frost"):g.place("frost",2,3,1)

func move_hero(g,id,lane,decisions):
 if g.ally(id).lane==lane:return
 var occupying=g.battle.heroes.filter(func(h):return h.hp>0 and h.lane==lane)
 if occupying.size()>=2:
  for occupant in occupying:
   if occupant.id=="ballista":continue
   for elsewhere in range(3):
    if elsewhere!=lane and g.reposition(occupant.id,elsewhere):
     decisions.move=int(decisions.get("move",0))+1;break
   if g.battle.heroes.filter(func(h):return h.hp>0 and h.lane==lane).size()<2:break
 if g.reposition(id,lane):decisions.move=int(decisions.get("move",0))+1

func fight(g,tactical,decisions):
 var turns=0
 while g.battle.phase=="playing" and turns<30:
  turns+=1
  if tactical:
   var q=g.battle.get("quest",{})
   if not q.is_empty():
    match q.id:
     "scout":move_hero(g,"rowan",2 if q.progress==0 else 0,decisions)
     "convoy":move_hero(g,"rowan",[0,1,2,0][mini(q.progress,3)],decisions)
     "beacons":
      for lane in range(3):
       if not q.progress & (1<<lane):
        for h in g.battle.heroes:
         if h.hp>0 and h.id!="ballista" and h.lane!=lane:move_hero(g,h.id,lane,decisions);break
        break
     "relic":
      for h in g.battle.heroes:
       if h.hp>0 and h.lane==2 and g.reason(h.id,"guard")=="":g.play(h.id,"guard",h.id);decisions.guard=int(decisions.get("guard",0))+1;break
   var danger=g.hazard()
   if not danger.is_empty():
    for h in g.battle.heroes:
     if h.hp>0 and h.lane==danger.lane and h.shield<danger.damage and g.reason(h.id,"guard")=="":
      g.play(h.id,"guard",h.id);decisions.guard=int(decisions.get("guard",0))+1
  for step in range(20):
   var best={};var best_score=0.0
   for h in g.battle.heroes:
    if h.hp<=0:continue
    for card in g.cards(h.id):
     if g.reason(h.id,card)!="":continue
     var rule=Game.COMMANDS[card]
     var targets=g.battle.enemies if rule.target=="enemy" else g.battle.heroes
     for t in targets:
      if g.reason(h.id,card,t.id)!="":continue
      var score=0.0
      if rule.target=="enemy":
       var victims=g.battle.enemies.filter(func(e):return e.hp>0 and e.lane==h.lane) if card=="cleave" else [t]
       for e in victims:
        var hit=0 if card=="gust" else g.damage_against(h.id,card,e)
        if e.get("trait","")=="armored" and hit>0:hit=maxi(1,hit-2)
        score+=mini(e.hp,hit)
        if tactical:
         if hit>=e.hp:score+=8+(8 if e.target=="gate" else 0)
         elif card in ["spark","pin","frost","gust"] and not e.stunned:score+=g.attack_power(e)*(3 if e.target=="gate" else 1.5)
      elif tactical and card=="mend":score=mini(t.max_hp-t.hp,g.damage_for(h.id,card))*1.5
      elif tactical and card in ["guard","ward"]:
       if rule.target=="self" and t.id!=h.id:continue
       var threat=0
       for e in g.battle.enemies:
        if e.hp>0 and not e.stunned and e.target==t.id:threat+=g.attack_power(e)
       var danger=g.hazard()
       if not danger.is_empty() and t.lane==danger.lane:threat+=danger.damage
       score=mini(maxi(0,threat-t.shield),6 if card=="guard" else 8)*0.8
      score/=rule.cost
      if score>best_score:best_score=score;best={"actor":h.id,"card":card,"target":t.id}
   if best.is_empty():break
   g.play(best.actor,best.card,best.target);decisions[best.card]=int(decisions.get(best.card,0))+1
   if g.battle.phase!="playing":break
  if g.battle.phase=="playing":g.resolve()
  var restored=Game.new()
  check(restored.restore(JSON.parse_string(JSON.stringify(g.snapshot()))) and restored.snapshot()==g.snapshot(),"journey state round-trips after real turn")
