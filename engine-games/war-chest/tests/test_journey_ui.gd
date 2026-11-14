extends SceneTree
const Main=preload("res://scripts/pocket_main.gd")
var checks=0
var failures=0
func check(ok: bool,label: String):
 checks+=1
 if not ok:failures+=1;push_error("FAIL: "+label)
func _init():call_deferred("run")
func button_named(screen,label):
 for node in screen.hud.get_children():
  if node is Button and node.text==label:return node
 return null
func run():
 if "--pocket-demo" not in OS.get_cmdline_user_args():quit(1);return
 var screen=Main.new();root.add_child(screen);screen.muted=true
 screen.game.campaign.xp=350;screen.game.campaign.unlocked=5;screen.game.campaign.wins=[1,1,1,1,1,1]
 screen.game.campaign.journey.completed=["scout","relic","citadel"]
 screen.keep_mode="quests";screen.show_page();await process_frame
 check(button_named(screen,"Side quests")!=null,"side quests are visible in existing keep navigation")
 for id in screen.Game.QUESTS:
  screen.quest_id=id;screen.show_page();await process_frame
  var q=screen.Game.QUESTS[id]
  var descriptions=0
  for node in screen.hud.get_children():
   if node is Label and node.text==q.desc:
    descriptions+=1;check(node.size.y<=95,"quest description fits native area: "+id)
  check(descriptions==1,"exactly one actual quest description is present: "+id)
 check(button_named(screen,"Start side quest  →")!=null,"unlocked quest has a concrete start action")
 screen.quest_id="convoy";screen.show_page();button_named(screen,"Start side quest  →").pressed.emit()
 check(screen.page=="battle" and screen.game.battle.quest.id=="convoy","native start opens actual quest rules")
 check(screen.game.battle_brief().contains("Rowan") and screen.game.battle_brief().contains("1"),"battle displays next escort destination")
 screen.game.retreat();screen.finish_combat_animation();await process_frame
 var failure_labels=0
 for node in screen.hud.get_children():
  if node is Label and node.text==screen.game.battle.quest_failure:
   failure_labels+=1;check(node.size.y<=165,"specific failure advice fits existing reward area")
 check(failure_labels==1,"quest defeat visibly explains why it ended")
 screen.return_to_keep()
 check(screen.page=="keep" and not screen.game.quest_done("convoy"),"retreat returns safely without granting quest progress")
 screen.game.campaign.mastery={"rowan":1,"lysa":1,"fen":1}
 screen.quest_id="scout";screen.start_battle();screen.move_to(2);screen.resolve_turn();screen.move_to(0);screen.resolve_turn();screen.finish_combat_animation()
 check(screen.game.battle.phase=="victory" and screen.game.has_loot(),"real UI rescue opens persistent reward choice")
 check(button_named(screen,"Choose a banner first").disabled,"cannot lose unclaimed quest banner by leaving")
 check(button_named(screen,"Rowan · Mastery I")!=null,"side-quest reward also exposes earned mastery rank-up")
 await process_frame
 var reward_labels=0
 for node in screen.hud.get_children():
  if node is Label and node.text==screen.game.battle.quest_reward:
   reward_labels+=1
   check(node.size.y<=63 and node.position.y+node.size.y<=288,"quest reward copy stays clear of company art")
 check(reward_labels==1,"quest victory visibly explains its unique reward")
 screen.game.claim_banner(screen.game.battle.loot[0]);screen.return_to_keep()
 screen.game.campaign.items.aegis=0;screen.game.campaign.items.lens=0
 for id in screen.Game.ITEMS:screen.game.campaign.items[id]=0
 screen.navigate("chest");await process_frame
 var items=[]
 for node in screen.hud.get_children():
  if node is Button and (node.text.ends_with("\nPacked") or node.text.ends_with("\nStored")):items.append(node)
 check(items.size()==11,"all eleven equipment choices remain reachable")
 var overlaps=false
 for i in range(items.size()):
  if items[i].position.y+items[i].size.y>720:overlaps=true
  for j in range(i):
   if items[i].get_rect().intersects(items[j].get_rect()):overlaps=true
 check(not overlaps,"equipment list neither overlaps itself nor its detail area")
 screen.gear="pennant";screen.show_page()
 check(screen.game.ITEMS.pennant.desc.contains("move"),"unique packing effect is explained")
 screen.navigate("shop")
 check(button_named(screen,"Buy · 0 gold")==null,"quest relics are not sold as free shop items")
 screen.game.new_campaign();screen.keep_mode="quests";screen.page="keep";screen.quest_id="engine";screen.show_page()
 check(button_named(screen,"Quest locked").disabled,"locked quests cannot start from native controls")
 screen.game.campaign.items.pennant=0;screen.game.place("pennant",4,2,0);screen.game.begin(0)
 screen.game.battle.commands=0;screen.page="battle";screen.selected="rowan";screen.show_page()
 var move_card=null
 for card in screen.card_buttons:
  if card.accessibility_name=="Move · 0 orders":move_card=card
 check(move_card!=null and not move_card.disabled,"native free Move remains enabled with zero orders")
 if move_card!=null:move_card.pressed.emit()
 button_named(screen,"Front 3").pressed.emit()
 check(screen.game.ally("rowan").lane==2 and screen.game.battle.commands==0,"native free move spends no order")
 screen.undo_action()
 check(screen.game.ally("rowan").lane==0 and screen.game.free_march() and screen.game.battle.commands==0,"undo restores pennant charge and zero orders")
 screen.queue_free();await process_frame;await process_frame
 print("JOURNEY UI TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
