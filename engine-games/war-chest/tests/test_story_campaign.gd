extends SceneTree
## Earned story routes. Every preparation and battle action uses the public model.
const Game=preload("res://scripts/story_game.gd")
const LEVELS=[2,2,2,3,3,3,4,4,5,6,6,6]
const IMMOBILE_NODES=["scout","convoy","beacons","engine"]
var checks=0
var failures=0
var evidence=[]
var current_actions=[]

func check(ok: bool,label: String):
 checks+=1
 if not ok: failures+=1;push_error("FAIL: "+label)

func _init(): call_deferred("run")

func run():
 var first=earned_route("reinforce-ward-hold",{"scout":"reinforce","beacons":"ward","citadel":"hold"})
 var second=earned_route("decoy-sunder-evacuate",{"scout":"decoy","beacons":"sunder","citadel":"evacuate"})
 check(not first.is_empty() and not second.is_empty(),"both complete routes produce ending evidence")
 if not first.is_empty() and not second.is_empty():
  check(first.ending!=second.ending,"three persistent decisions produce different homecomings")
 for arg in OS.get_cmdline_user_args():
  if arg.begins_with("--story-evidence="):
   var path=arg.trim_prefix("--story-evidence=")
   check(path.is_absolute_path(),"optional evidence path is absolute")
   if path.is_absolute_path():
    var file=FileAccess.open(path,FileAccess.WRITE)
    check(file!=null,"optional evidence opens outside player storage")
    if file: file.store_string(JSON.stringify({"checks":checks,"failures":failures,"routes":evidence},"  "))
 print("STORY CAMPAIGN TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)

func round_trip(g,label: String):
 var copy=Game.new()
 var state=g.snapshot()
 check(copy.restore(JSON.parse_string(JSON.stringify(state))) and copy.snapshot()==state,"exact story JSON round trip: "+label)

func action(kind: String,details: Dictionary):
 var entry=details.duplicate(true);entry.kind=kind;current_actions.append(entry)

func advance(g):
 var phase=g.campaign.story.phase;var line=g.campaign.story.line
 var ok=g.advance_story()
 check(ok,"legal story advance from %s line %d" % [phase,line])
 if ok: action("advance",{"phase":phase,"line":line})
 round_trip(g,"scene advance")
 return ok

func claim_reward(g):
 if g.has_loot():
  var id="stone" if "stone" in g.battle.loot else ("hunt" if "hunt" in g.battle.loot else g.battle.loot[0])
  check(g.claim_banner(id),"earned victory banner claimed")
  action("banner",{"id":id})
  round_trip(g,"pending reward claimed")
 var retained=g.snapshot()
 check(not g.return_to_camp() and g.snapshot()==retained,"public camp return cannot discard an unread victory conversation")
 check(g.campaign.story.phase=="outro" and g.battle.phase=="victory","claimed victory stays available throughout its authored conversation")
 round_trip(g,"claimed victory retained for outro")

func equip_owned_banner(g):
 if g.war().banners.has("stone"):
  check(g.equip_banner("stone"),"owned Stoneguard equipped")
  action("equip_banner",{"id":"stone"})
 elif g.war().banners.has("hunt"):
  check(g.equip_banner("hunt"),"owned Farstrider equipped")
  action("equip_banner",{"id":"hunt"})

func prepare(g,index: int):
 if g.campaign.items.has("cube") and not g.campaign.placements.has("cube"):
  check(g.place("cube",1,1,0),"earned rune packed beside starter weapons")
  action("place",{"id":"cube","x":1,"y":1,"rotation":0})
 # Keep the initial rune demonstration at its genuine 8 -> 10 damage.
 if index<2: return
 if g.campaign.talent=="":
  check(g.choose_talent("might"),"free earned talent chosen")
  action("talent",{"id":"might"})
 if not g.campaign.mage and g.campaign.items.has("pennant") and not g.campaign.placements.has("pennant"):
  check(g.place("pennant",4,2,0),"earned pennant packed for the escort chapter")
  action("place",{"id":"pennant","x":4,"y":2,"rotation":0})
 if g.campaign.mage:
  if g.campaign.placements.has("pennant"):
   g.stow("pennant");action("stow",{"id":"pennant"})
  if not g.campaign.placements.has("staff"):
   check(g.place("staff",4,2,0),"Merrin's earned staff packed")
   action("place",{"id":"staff","x":4,"y":2,"rotation":0})
  if not g.campaign.items.has("flask") and g.campaign.gold>=Game.ITEMS.flask.price:
   check(g.buy("flask"),"medicine purchased with earned gold")
   action("buy",{"id":"flask"})
  if g.campaign.items.has("flask") and not g.campaign.placements.has("flask"):
   check(g.place("flask",0,3,0),"purchased medicine packed")
   action("place",{"id":"flask","x":0,"y":3,"rotation":0})
 if g.campaign.items.has("frost") and not g.campaign.placements.has("frost"):
  check(g.place("frost",2,3,1),"level-four relic packed with a legal rotation")
  action("place",{"id":"frost","x":2,"y":3,"rotation":1})
 for id in ["blade","bow","staff","ward","frost","flask"]:
  if not g.campaign.items.has(id): continue
  while g.campaign.items[id]<g.forge_limit():
   var cost=30+int(g.campaign.items[id])*25
   if g.campaign.gold<cost: break
   check(g.upgrade(id),"affordable earned forge: "+id)
   action("upgrade",{"id":id,"cost":cost})
 check(g.campaign.gold>=0,"preparation never invents or overdraws gold")

func earned_route(label: String,choices: Dictionary) -> Dictionary:
 var g=Game.new();current_actions=[]
 check(g.enroll_story(),"genuinely new campaign enrolls: "+label)
 action("enroll",{})
 var result={"id":label,"choices":choices,"nodes":[],"ending":[]}
 for index in range(Game.StoryData.NODES.size()):
  var node=Game.StoryData.NODES[index]
  check(g.story_node().id==node.id and g.campaign.story.phase=="intro","authored encounter follows the actual previous victory: "+node.id)
  while g.campaign.story.phase=="intro":
   if not advance(g): return {}
  check(g.campaign.story.phase=="prepare","intro finishes at actual preparation")
  check(g.campaign.mage==(index>=6),"Merrin appears only after the recovered ledger")
  prepare(g,index)
  round_trip(g,"prepared "+node.id)
  if not g.begin_story_node():
   check(false,"earned encounter begins: %s: %s" % [node.id,g.message]);return {}
  action("begin",{"node":node.id})
  round_trip(g,"battle entry "+node.id)
  var start=g.snapshot()
  if node.id in IMMOBILE_NODES:
   var immobile=Game.new()
   check(immobile.restore(JSON.parse_string(JSON.stringify(start))),"no-movement policy starts from identical earned state")
   var earned_actions=current_actions
   current_actions=[]
   var omitted=fight(immobile,false)
   check(immobile.battle.phase=="defeat","matched no-movement policy cannot complete "+node.id)
   var objective=immobile.battle.story.progress if node.id=="engine" else immobile.battle.quest.progress
   check(objective<({"scout":2,"convoy":4,"beacons":7,"engine":2}[node.id]),"omitted movement leaves the concrete story objective incomplete: "+node.id)
   check(immobile.battle.heroes.all(func(h):return h.hp>0),"movement contrast fails its objective while the company survives: "+node.id)
   var loss=immobile.battle.get("story_failure",immobile.battle.get("quest_failure",""))
   check(not loss.is_empty(),"objective loss gives a concrete recovery explanation: "+node.id)
   if node.id=="engine":
    check(immobile.battle.enemies.all(func(e):return e.hp<=0) and immobile.battle.gate>0,"clearing the entire engine patrol does not substitute for extraction")
   print("STORY NO-MOVEMENT ",label," ",node.id," ",immobile.battle.phase," objective=",objective)
   result.nodes.append({"counterfactual":node.id,"policy":"no movement","phase":immobile.battle.phase,"objective":objective,"orders":omitted,"actions":current_actions.duplicate(true),"final":immobile.snapshot()})
   current_actions=earned_actions
  if node.id=="relic":
   var passive=Game.new();check(passive.restore(start),"passive recovery uses the earned Reliquary state")
   for turn in range(10):
    if passive.battle.phase!="playing": break
    check(passive.resolve(),"passive recovery resolves a real enemy turn")
   check(passive.battle.phase=="defeat" and passive.battle.story.progress<2,"passive banner protection cannot carry the seal home")
   result.nodes.append({"counterfactual":node.id,"policy":"no orders","phase":passive.battle.phase,"objective":passive.battle.story.progress,"final":passive.snapshot()})
  var early={}
  if node.id=="engine": early=early_engine(start,result)
  if node.id=="ashen":
   check(g.damage_for("rowan","cleave")==10,"unforged earned rune supplies the authored 8 -> 10 payoff")
   var victim={}
   for enemy in g.battle.enemies:
    if enemy.lane==g.ally("rowan").lane and enemy.hp==10: victim=enemy;break
   check(not victim.is_empty(),"Ashen formation exposes a genuine ten-health target")
   if not victim.is_empty():
    var id=victim.id;check(g.play("rowan","cleave",id),"earned rune command is legal")
    action("play",{"actor":"rowan","card":"cleave","target":id})
    check(g.foe(id).hp==0,"rune-linked hit kills the target before its attack")
    round_trip(g,"rune payoff")
  var used=fight(g,true)
  print("STORY ROUTE ",label," ",node.id," ",g.battle.phase," turn=",g.battle.round," gate=",g.battle.gate," level=",g.level()," gold=",g.campaign.gold)
  check(g.battle.phase=="victory","earned authored encounter is winnable: "+node.id)
  if g.battle.phase!="victory":
   result.failed_node=node.id;result.failed_snapshot=g.snapshot();evidence.append(result);return {}
  if node.id=="engine":
   check(early.get("phase","")=="victory","early and delayed collection both earn the actual escape")
   result.engine_comparison={"early_round":early.get("round",0),"delayed_round":g.battle.round,"early_damage":early.get("incoming_damage",0),"delayed_final_hp":g.ally("rowan").hp}
  check(g.level()==LEVELS[index] and g.campaign.xp==(LEVELS[index]-1)*70,"actual six-level milestones remain paced: "+node.id)
  check(g.campaign.story.completed.size()==index+1,"one victory commits exactly one story beat")
  if node.id in ["relic","engine"]: check(g.battle.story.progress==2,"victory requires actual surviving extraction: "+node.id)
  round_trip(g,"completed "+node.id)
  result.nodes.append({"node":node.id,"phase":g.battle.phase,"round":g.battle.round,"gate":g.battle.gate,"level":g.level(),"gold":g.campaign.gold,"commands":used,"actions":current_actions.duplicate(true)})
  current_actions=[]
  claim_reward(g)
  while g.campaign.story.phase=="outro":
   if not g.story_options().is_empty():
    check(choices.has(node.id) and g.choose_story_option(choices[node.id]),"authored choice commits after its earned encounter")
    action("choice",{"node":node.id,"option":choices[node.id]})
    round_trip(g,"consequential choice")
   if not advance(g): return {}
  check(g.battle.is_empty(),"final outro advance clears victory and opens the next authored phase")
  equip_owned_banner(g)
 check(g.campaign.story.phase=="ending","only the extracted chest opens the ending")
 while g.campaign.story.phase=="ending":
  result.ending.append(g.story_line().text)
  if not advance(g): return {}
 check(not g.story_active() and g.campaign.story.phase=="complete","full homecoming closes the authored campaign")
 check(g.campaign.story.completed.size()==12 and g.campaign.journey.completed.size()==6,"all twelve encounters and six quests were earned")
 check(g.campaign.wins==[1,1,1,1,1,1] and g.war().contracts==0,"six actual main victories and no contract grinding")
 check(g.campaign.items.has_all(Game.RELICS) and g.campaign.items.has("flask"),"unique quest relics and purchased medicine are real owned equipment")
 check(g.campaign.story.decisions==choices,"all three choices persist through the complete ending")
 var ending=" ".join(result.ending)
 for phrase in (["steel plates","sheltering seal","going back to Winterwatch"] if label=="reinforce-ward-hold" else ["decoy lanterns","weapon tuning","Winterwatch is gone"]):
  check(ending.contains(phrase),"homecoming remembers the chosen consequence: "+phrase)
 result.final=g.snapshot();result.remaining_actions=current_actions.duplicate(true)
 replay(result)
 evidence.append(result)
 return result

func early_engine(start: Dictionary,result: Dictionary) -> Dictionary:
 var g=Game.new()
 check(g.restore(JSON.parse_string(JSON.stringify(start))),"early chest policy starts from the identical earned company")
 var earned_actions=current_actions;current_actions=[]
 var used={};var initial_hp=g.ally("rowan").hp
 move_hero(g,"rowan",1,used)
 check(g.ally("rowan").lane==1,"the earned carrier reaches the Causeway legally")
 check(g.resolve(),"early carrier survives a real enemy turn before collection")
 action("resolve",{"node":"engine"})
 check(g.battle.phase=="playing" and g.battle.story.progress==1,"live enemies allow collection but never immediate escape")
 check(g.battle.enemies.any(func(e):return e.hp>0),"early collection happens before any patrol is removed")
 var incoming=initial_hp-g.ally("rowan").hp
 check(incoming>0 and g.ally("rowan").hp>0,"earned early carrier takes actual incoming damage and lives")
 round_trip(g,"earned early collection under fire")
 move_hero(g,"rowan",0,used)
 if g.reason("rowan","guard","rowan")=="": order(g,"rowan","guard","rowan",used)
 check(g.resolve(),"covered carrier survives a turn on the exit front")
 action("resolve",{"node":"engine"})
 check(g.battle.phase=="playing" and g.battle.story.progress==1 and g.battle.enemies.any(func(e):return e.hp>0),"carrying the chest to the High wall cannot bypass living enemies")
 round_trip(g,"earned attempted exit under fire")
 var finish=fight(g,true)
 check(g.battle.phase=="victory" and g.battle.story.progress==2 and g.ally("rowan").hp>0,"earned early collection can clear every foe and extract its living carrier")
 check(g.battle.enemies.all(func(e):return e.hp<=0),"early escape really clears all foes without fixture settlement")
 var entry={"counterfactual":"engine","policy":"collect under fire","phase":g.battle.phase,"round":g.battle.round,"incoming_damage":incoming,"opening_commands":used,"finishing_commands":finish,"actions":current_actions.duplicate(true),"final":g.snapshot()}
 result.nodes.append(entry)
 current_actions=earned_actions
 return entry

func replay(result: Dictionary):
 var replayed=Game.new();var actions=[]
 for entry in result.nodes:
  if entry.has("node"): actions.append_array(entry.actions)
 actions.append_array(result.remaining_actions)
 for entry in actions:
  var ok=true
  match entry.kind:
   "enroll": ok=replayed.enroll_story()
   "advance": ok=replayed.advance_story()
   "choice": ok=replayed.choose_story_option(entry.option)
   "banner": ok=replayed.claim_banner(entry.id)
   "camp": ok=replayed.return_to_camp()
   "equip_banner": ok=replayed.equip_banner(entry.id)
   "place": ok=replayed.place(entry.id,entry.x,entry.y,entry.rotation)
   "talent": ok=replayed.choose_talent(entry.id)
   "stow": replayed.stow(entry.id)
   "buy": ok=replayed.buy(entry.id)
   "upgrade": ok=replayed.upgrade(entry.id)
   "begin": ok=replayed.begin_story_node()
   "play": ok=replayed.play(entry.actor,entry.card,entry.target)
   "move": ok=replayed.reposition(entry.actor,entry.lane)
   "resolve": ok=replayed.resolve()
   _: ok=false
  check(ok,"recorded earned action replays legally: "+entry.kind)
  if not ok: return
 check(replayed.snapshot()==result.final,"entire earned story trace exactly replays: "+result.id)

func move_hero(g,id: String,lane: int,used: Dictionary):
 if g.ally(id).hp<=0 or g.ally(id).lane==lane: return
 var occupying=g.battle.heroes.filter(func(h):return h.hp>0 and h.lane==lane)
 if occupying.size()>=2:
  for occupant in occupying:
   if occupant.id=="ballista": continue
   for elsewhere in range(3):
    if elsewhere!=lane and g.reposition(occupant.id,elsewhere):
     used.move=int(used.get("move",0))+1;action("move",{"actor":occupant.id,"lane":elsewhere});break
   if g.battle.heroes.filter(func(h):return h.hp>0 and h.lane==lane).size()<2: break
 if g.reposition(id,lane):
  used.move=int(used.get("move",0))+1;action("move",{"actor":id,"lane":lane})

func order(g,actor: String,card: String,target: String,used: Dictionary):
 check(g.play(actor,card,target),"solver issues a currently legal command: "+card)
 used[card]=int(used.get(card,0))+1
 action("play",{"actor":actor,"card":card,"target":target})

func fight(g,movement: bool) -> Dictionary:
 var used={};var turns=0
 while g.battle.phase=="playing" and turns<30:
  turns+=1
  var node=g.battle.story.node
  if movement:
   var q=g.battle.get("quest",{})
   match node:
    "scout": move_hero(g,"rowan",2 if q.progress==0 else 0,used)
    "convoy": move_hero(g,"rowan",[0,1,2,0][mini(q.progress,3)],used)
    "beacons":
     for lane in range(3):
      if not q.progress & (1<<lane):
       for h in g.battle.heroes:
        if h.hp>0 and h.id!="ballista" and h.lane!=lane: move_hero(g,h.id,lane,used);break
       break
    "relic": move_hero(g,g.battle.story.carrier if g.battle.story.progress==1 else "rowan",0 if g.battle.story.progress==1 else 2,used)
    "engine":
     if g.battle.enemies.all(func(e):return e.hp<=0): move_hero(g,"rowan",1 if g.battle.story.progress==0 else 0,used)
    "winter":
     if g.battle.story.decisions.get("citadel","")=="evacuate": move_hero(g,"rowan",2,used)
  if node=="relic" and g.battle.story.progress==0:
   for h in g.battle.heroes:
    if h.hp>0 and h.lane==2 and g.reason(h.id,"guard",h.id)=="": order(g,h.id,"guard",h.id,used);break
  var danger=g.hazard()
  if not danger.is_empty():
   for h in g.battle.heroes:
    if h.hp>0 and h.lane==danger.lane and h.shield<danger.damage and g.reason(h.id,"guard",h.id)=="": order(g,h.id,"guard",h.id,used)
  for step in range(20):
   var best={};var best_score=0.0
   for h in g.battle.heroes:
    if h.hp<=0: continue
    for card in g.cards(h.id):
     if g.reason(h.id,card)!="": continue
     var rule=Game.COMMANDS[card]
     var targets=g.battle.enemies if rule.target=="enemy" else ([h] if rule.target=="self" else g.battle.heroes)
     for target in targets:
      if g.reason(h.id,card,target.id)!="": continue
      var score=0.0
      if rule.target=="enemy":
       var victims=g.battle.enemies.filter(func(e):return e.hp>0 and e.lane==h.lane) if card=="cleave" else [target]
       for enemy in victims:
        var hit=0 if card=="gust" else g.damage_against(h.id,card,enemy)
        if enemy.get("trait","")=="armored" and hit>0: hit=maxi(1,hit-2)
        score+=mini(enemy.hp,hit)
        if hit>=enemy.hp: score+=8+(8 if enemy.target=="gate" else 0)
        elif card in ["spark","pin","frost","gust"] and not enemy.stunned: score+=g.attack_power(enemy)*(3 if enemy.target=="gate" else 1.5)
      elif card=="mend": score=mini(target.max_hp-target.hp,g.damage_for(h.id,card))*1.5
      elif card in ["guard","ward","rally"]:
       var threat=0
       for enemy in g.battle.enemies:
        if enemy.hp>0 and not enemy.stunned and enemy.target==target.id: threat+=g.attack_power(enemy)
       if not danger.is_empty() and target.lane==danger.lane: threat+=danger.damage
       score=mini(maxi(0,threat-target.shield),6 if card=="guard" else 8)*0.8
      score/=rule.cost
      if score>best_score: best_score=score;best={"actor":h.id,"card":card,"target":target.id}
   if best.is_empty(): break
   order(g,best.actor,best.card,best.target,used)
   if g.battle.phase!="playing": break
  if g.battle.phase=="playing":
   check(g.resolve(),"story enemy turn resolves")
   action("resolve",{"node":node})
  round_trip(g,"earned turn "+node)
 return used
