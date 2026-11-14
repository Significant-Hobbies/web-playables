extends SceneTree
const Game=preload("res://scripts/story_game.gd")
const Legacy=preload("res://scripts/opening_game.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok: failures+=1;push_error("FAIL: "+label)
func round_trip(g,label: String):
 var saved=g.snapshot();var copy=Game.new()
 check(copy.restore(JSON.parse_string(JSON.stringify(saved))) and copy.snapshot()==saved,"story round trip: "+label)
func test_storage() -> String:
 var storage=OS.get_cache_dir().path_join("war-chest-test-saves/story-%d-%d" % [OS.get_process_id(),Time.get_ticks_usec()])
 for arg in OS.get_cmdline_user_args():
  if arg.begins_with("--story-test-storage="): storage=arg.substr("--story-test-storage=".length())
 check(storage.is_absolute_path(),"story save fixtures use explicit absolute isolated storage")
 check(DirAccess.make_dir_recursive_absolute(storage)==OK,"isolated story fixture directory exists")
 return storage
func scene_to_prepare(g):
 while g.campaign.story.phase=="intro":
  check(g.advance_story(),"intro line advances")
func move(g,id: String,lane: int):
 if g.ally(id).lane==lane: return true
 if g.battle.heroes.filter(func(h):return h.hp>0 and h.lane==lane).size()>=2:
  for h in g.battle.heroes:
   if h.hp>0 and h.lane==lane and h.id!="ballista":
    for elsewhere in range(3):
     if elsewhere!=lane and g.reposition(h.id,elsewhere): break
    break
 return g.reposition(id,lane)
func fixture(index: int,decisions: Dictionary):
 var g=Game.new();g.enroll_story()
 g.campaign.story.node=index;g.campaign.story.phase="prepare"
 g.campaign.story.decisions=decisions.duplicate(true)
 for previous in range(index):
  var node=Game.StoryData.NODES[previous]
  g.campaign.story.completed.append(node.id)
  g.campaign.xp+=node.xp
  if node.kind=="main":
   g.campaign.wins[node.mission]+=1;g.campaign.unlocked=mini(5,node.mission+1)
  else: g.campaign.journey.completed.append(node.quest)
  if node.id=="relic": g.campaign.mage=true;g.campaign.items.staff=0
 g.campaign.opening.stage=3;g.campaign.opening.rune_used=true;g.campaign.items.cube=0
 if g.level()>=4: g.campaign.items.frost=0
 check(g.validate_save(g.snapshot())=="","unit story fixture validates")
 return g
func claim_scene(g):
 if g.has_loot(): check(g.claim_banner(g.battle.loot[0]),"unit fixture claims real offered banner")
 while g.campaign.story.phase=="outro" and g.story_options().is_empty():
  check(g.advance_story(),"authored outro advances")
  if g.campaign.story.phase!="outro": break
func _init():
 var g=Game.new()
 check(g.enroll_story() and g.story_node().id=="gate","fresh creation enrolls at the human stakes")
 check(g.story_line().speaker=="Lysa" and not g.story_line().text.is_empty(),"authored scene uses named people")
 check(not g.enroll_story(),"story enrollment is creation-only and cannot reset progress")
 round_trip(g,"first dialogue")
 check(g.advance_story() and g.campaign.story.line==1,"scene cursor advances")
 round_trip(g,"mid-dialogue")
 var pristine=Legacy.new();var migrated=Game.new()
 check(migrated.restore(pristine.snapshot()) and not migrated.enroll_story(),"pristine restored legacy is not silently enrolled")
 var active=Legacy.new();active.begin(0);active.play("rowan","guard","rowan")
 check(migrated.restore(active.snapshot()) and migrated.snapshot()==active.snapshot(),"legacy active state remains exact")
 active.resolve();migrated.resolve()
 check(migrated.snapshot()==active.snapshot(),"legacy next enemy turn remains exact")
 scene_to_prepare(g)
 var before=g.snapshot()
 check(not g.begin(0) and g.snapshot()==before,"story blocks direct off-route main battle")
 check(not g.begin_quest("scout") and g.snapshot()==before,"story blocks off-route side quests")
 check(not g.begin_contract("raid",1) and g.snapshot()==before,"story blocks contract grinding")
 check(not g.recruit() and not g.buy("staff") and g.snapshot()==before,"Merrin and staff follow their authored introduction")
 check(g.begin_story_node() and g.campaign.story.phase=="battle","prepared story enters its actual battle")
 round_trip(g,"first battle")
 var progress=g.campaign.story.duplicate(true)
 g.retreat()
 check(g.campaign.story==progress and g.battle.phase=="defeat","defeat retains the story milestone")
 check(g.return_to_camp() and g.campaign.story.phase=="prepare" and g.story_node().id=="gate","return after defeat retries same encounter")
 check(g.begin_story_node(),"retry enters normally")
 # Unit fixtures isolate phase/reward rules; earned-route proof lives separately.
 g.settle(true)
 check(g.campaign.xp==70 and g.level()==2 and g.campaign.story.phase=="outro","Gate alone earns the first level and outro")
 check(g.campaign.items.has("cube") and not g.campaign.placements.has("cube"),"story preserves the earned unpacked rune")
 before=g.snapshot();g.settle(true)
 check(g.snapshot()==before,"story settlement cannot duplicate rewards or milestones")
 round_trip(g,"first reward")
 for line in range(4):
  if g.campaign.story.phase!="outro": break
  check(g.advance_story(),"first outro advances")
 check(g.campaign.story.phase=="intro","bounded first conversation reaches the next scene")
 scene_to_prepare(g)
 before=g.snapshot()
 check(not g.begin_story_node() and g.snapshot()==before,"Ashen requires genuine rune preparation")
 check(g.place("cube",1,0,0) and g.begin_story_node(),"linked rune opens the authored roadblock")
 var target=g.foe("enemy_1");var linked=g.damage_against("rowan","cleave",target)
 var layout=g.campaign.placements.duplicate(true);g.campaign.placements.erase("cube")
 check(target.hp==10 and g.damage_against("rowan","cleave",target)==8 and linked==10,"rune changes first roadblock target survival")
 g.campaign.placements=layout
 check(g.play("rowan","cleave",target.id) and target.hp==0,"linked attack really defeats the target")
 g.settle(true)
 check(g.campaign.xp==70 and g.battle.new_level==0,"Ashen victory adds no premature level")
 before=g.snapshot()
 check(g.has_loot() and not g.advance_story() and g.snapshot()==before,"pending banner cannot be skipped through dialogue")
 var missing_outro=before.duplicate(true)
 missing_outro.battle={}
 var rejected_outro=Game.new();var intact_outro=rejected_outro.snapshot()
 check(not rejected_outro.restore(missing_outro) and rejected_outro.snapshot()==intact_outro,"an outro cannot lose its victory battle and pending reward on restore")
 g.claim_banner(g.battle.loot[0])
 before=g.snapshot()
 check(not g.return_to_camp() and g.snapshot()==before,"claimed story victory stays intact until its conversation finishes")
 round_trip(g,"claimed second reward")
 var rescued=fixture(2,{})
 rescued.begin_story_node()
 check(rescued.battle_brief().contains("Ivo") and not rescued.battle_brief().contains("Pip"),"story rescue names the actual person at stake")
 rescued.battle.quest.progress=2;rescued.settle(true)
 check(not rescued.battle.quest_reward.contains("Contract"),"story rewards do not advertise locked contracts")
 claim_scene(rescued)
 before=rescued.snapshot()
 check(not rescued.choose_story_option("unknown") and rescued.snapshot()==before,"unoffered story choice is atomic")
 var convoy_states=[]
 for choice in ["reinforce","decoy"]:
  var branch=Game.new();check(branch.restore(rescued.snapshot()),"rescue decision state restores")
  check(branch.choose_story_option(choice),"authored rescue choice accepted")
  before=branch.snapshot()
  check(not branch.choose_story_option(choice) and branch.snapshot()==before,"story choice cannot be repeated")
  round_trip(branch,"rescue choice "+choice)
  check(branch.advance_story(),"choice explicitly advances to next scene")
  scene_to_prepare(branch);check(branch.begin_story_node(),"chosen convoy begins")
  convoy_states.append(branch.snapshot())
  check(branch.battle.gate==(30 if choice=="reinforce" else 25),"choice sets real convoy durability")
  check(branch.battle.story.formation.size()==(0 if choice=="reinforce" else 1),"decoy records the actual relocated enemy")
  if choice=="decoy":
   var shift=branch.battle.story.formation[0]
   check(branch.foe(shift.id).lane==1,"decoy draws an enemy away from Rowan's first escort front")
  round_trip(branch,"convoy branch "+choice)
 check(convoy_states[0].battle.enemies[0].lane!=convoy_states[1].battle.enemies[0].lane,"choices produce distinct enemy formations")
 var lost_cart=Game.new();lost_cart.restore(convoy_states[1])
 lost_cart.battle.gate=5;lost_cart.ally("rowan").lane=2
 check(lost_cart.resolve() and lost_cart.battle.phase=="defeat","missed convoy escort can lose cargo before enemy attacks")
 check(lost_cart.battle.story_failure.contains("Missed escorts") and lost_cart.battle.quest_failure==lost_cart.battle.story_failure,"story convoy loss explains the missing escort")
 round_trip(lost_cart,"lost supply cart")
 for choice in ["ward","sunder"]:
  var marshal=fixture(7,{"scout":"reinforce","beacons":choice})
  check(marshal.begin_story_node(),"marshal branch begins")
  var boss=marshal.battle.enemies.filter(func(e):return e.boss)[0]
  check(marshal.ally("rowan").shield==(4 if choice=="ward" else 0),"ward grants actual starting block")
  var baseline=marshal.damage_for("lysa","volley")
  check(marshal.damage_against("lysa","volley",boss)==baseline+(2 if choice=="sunder" else 0),"sunder changes real boss-hit damage")
  if choice=="sunder": check(marshal.enemy_detail(boss).contains("2 damage"),"marshal weakness is inspectable")
  round_trip(marshal,"marshal branch "+choice)
 for choice in ["hold","evacuate"]:
  var winter=fixture(9,{"scout":"reinforce","beacons":"ward","citadel":choice})
  check(winter.begin_story_node(),"Winterwatch branch begins")
  check(winter.encounter().rounds==(6 if choice=="hold" else 4) and winter.battle.gate==(30 if choice=="hold" else 20),"Winterwatch choice changes actual deadline and durability")
  round_trip(winter,"Winterwatch "+choice)
  if choice=="evacuate":
   before=winter.snapshot();winter.battle.round=4;winter.settle(true)
   check(winter.battle.phase=="defeat" and winter.battle.story_failure.contains("front 3"),"unfinished escort cannot become a generic defense victory")
   check(winter.restore(before) and move(winter,"rowan",2),"escort can reach its required destination")
   winter.battle.round=4
   for enemy in winter.battle.enemies: enemy.stunned=true
   check(winter.resolve() and winter.battle.phase=="victory","living lower-road escort completes the evacuation")
   round_trip(winter,"evacuation victory")
   for corruption in ["fallen escort","wrong exit"]:
    var broken_evacuation=winter.snapshot()
    for member in broken_evacuation.battle.heroes:
     if member.id=="rowan":
      if corruption=="fallen escort": member.hp=0
      else: member.lane=0
    check(not Game.new().restore(broken_evacuation),"malformed evacuation victory rejects "+corruption)
 var seal=fixture(5,{"scout":"reinforce"})
 seal.campaign.war.banners={"stone":3};seal.campaign.war.equipped="stone"
 seal.campaign.items.staff=2 # Preservation fixture, not an earned pre-recruit purchase.
 seal.begin_story_node()
 for turn in range(3):
  check(seal.resolve(),"passively shielded recovery turn resolves")
  round_trip(seal,"seal recovery turn")
 check(seal.battle.phase=="playing" and seal.battle.quest.progress==3 and seal.battle.story.progress==1,"Stoneguard can protect recovery but cannot automatically extract")
 var carrier=seal.battle.story.carrier
 before=seal.snapshot()
 var premature_seal=before.duplicate(true)
 premature_seal.battle.story.progress=2
 check(seal.validate_save(premature_seal)!="" and not Game.new().restore(premature_seal),"completed seal extraction cannot remain in an active battle")
 check(move(seal,carrier,0),"actual seal carrier moves toward the exit")
 for enemy in seal.battle.enemies: enemy.stunned=true
 check(seal.resolve() and seal.battle.phase=="victory","carrier must survive the extraction turn")
 check(seal.campaign.mage and seal.campaign.items.staff==2,"Merrin's narrative joining preserves a forged staff")
 round_trip(seal,"seal extraction victory")
 var fallen=Game.new();fallen.restore(before)
 fallen.ally(carrier).hp=1;fallen.ally(carrier).shield=0
 for enemy in fallen.battle.enemies: enemy.target=carrier;enemy.power=50
 fallen.resolve()
 check(fallen.battle.phase=="defeat" and fallen.battle.quest_failure.contains("carrier fell"),"fallen carrier cannot award an extracted seal")
 var final=fixture(11,{"scout":"decoy","beacons":"sunder","citadel":"evacuate"})
 final.begin_story_node()
 check(final.battle.enemies.filter(func(e):return e.boss)[0].name=="Engine captain","the Crown is not resurrected as the engine's commander")
 var early=Game.new();early.restore(final.snapshot())
 check(move(early,"rowan",1) and early.resolve() and early.battle.story.progress==1,"Rowan can collect under live enemy fire")
 check(early.battle.enemies.any(func(e):return e.hp>0) and early.ally("rowan").hp<early.ally("rowan").max_hp,"early collection exposes the carrier to real incoming attacks")
 round_trip(early,"chest collected while engine active")
 check(move(early,"rowan",0) and early.resolve() and early.battle.phase=="playing" and early.battle.story.progress==1,"escaping with the chest still requires clearing the engine")
 for enemy in early.battle.enemies: enemy.hp=0
 check(early.resolve() and early.battle.phase=="victory","covered carrier can extract once the remaining enemies are cleared")
 var company=final.snapshot()
 check(not final.choose_pet("owl") and final.snapshot()==company and not final.story_pet_lock("owl").is_empty(),"Fen remains in the active story's authored cast")
 for enemy in final.battle.enemies: enemy.hp=0
 final.outcome()
 check(final.battle.phase=="playing" and final.battle.story.progress==0,"defeating every foe does not silently extract the chest")
 round_trip(final,"silent engine awaiting collection")
 before=final.snapshot()
 check(move(final,"rowan",1) and final.resolve() and final.battle.story.progress==1,"Rowan collects on the Causeway after surviving its turn")
 round_trip(final,"chest collected")
 var premature_chest=final.snapshot()
 premature_chest.battle.story.progress=2
 check(final.validate_save(premature_chest)!="" and not Game.new().restore(premature_chest),"completed chest extraction cannot remain in an active battle")
 check(move(final,"rowan",0) and final.resolve() and final.battle.phase=="victory","living Rowan extracts across the High wall")
 round_trip(final,"chest extracted")
 for corruption in ["fallen carrier","wrong exit","living escort"]:
  var malformed_exit=final.snapshot()
  if corruption=="living escort": malformed_exit.battle.enemies[0].hp=1
  else:
   for member in malformed_exit.battle.heroes:
    if member.id=="rowan":
     if corruption=="fallen carrier": member.hp=0
     else: member.lane=1
  check(final.validate_save(malformed_exit)!="","malformed extraction victory rejects "+corruption)
 var timeout=Game.new();timeout.restore(before)
 while timeout.battle.phase=="playing": timeout.resolve()
 check(timeout.battle.phase=="defeat" and timeout.battle.quest_failure.contains("collect the chest"),"no-movement chest policy misses the deadline")
 claim_scene(final)
 check(final.campaign.story.phase=="ending" and final.story_lines().size()>3,"extraction opens the complete authored epilogue")
 check(JSON.stringify(final.story_lines()).contains("decoy") and JSON.stringify(final.story_lines()).contains("Winterwatch is gone"),"ending recalls the company's real decisions")
 while final.campaign.story.phase=="ending":
  round_trip(final,"ending cursor")
  check(final.advance_story(),"ending line advances")
 check(not final.story_active() and final.campaign.story.phase=="complete","ending unlocks free exploration")
 check(final.choose_pet("owl"),"the epilogue unlocks Talon's free-play companion choice")
 check(final.begin_contract("raid",1),"contracts are playable after the authored ending")
 round_trip(final,"free play after story")
 # Typed extension corruption must fail without a runtime comparison escape.
 for field in ["version","node","phase","line","completed","decisions"]:
  for bad in [null,false,"broken",[],{},-1,1.5]:
   if typeof(bad)==typeof(g.campaign.story[field]) and bad==g.campaign.story[field]: continue
   var broken=g.snapshot();broken.campaign.story[field]=bad
   var copy=Game.new();var intact=copy.snapshot()
   check(not copy.restore(broken) and copy.snapshot()==intact,"malformed story rejects atomically: "+field)
 for field in ["version","node","decisions","progress","pending","carrier","formation","initial_gate"]:
  for bad in [null,false,"broken",[],{},-1,1.5]:
   if typeof(bad)==typeof(g.battle.story[field]) and bad==g.battle.story[field]: continue
   var broken=g.snapshot();broken.battle.story[field]=bad
   var copy=Game.new();var intact=copy.snapshot()
   check(not copy.restore(broken) and copy.snapshot()==intact,"malformed story battle rejects atomically: "+field)
 var broken=g.snapshot();broken.battle.story.pending="broken"
 var path=test_storage().path_join("malformed-story.json")
 for malformed in [broken,premature_seal,premature_chest,missing_outro]:
  var original=JSON.stringify(malformed);var file=FileAccess.open(path,FileAccess.WRITE);file.store_string(original);file.close()
  var protected=Game.new()
  check(not protected.load_from(path) and protected.save_locked,"malformed story file disables saving")
  check(not protected.save_to(path) and FileAccess.get_file_as_string(path)==original,"malformed story bytes remain intact")
 print("STORY TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
