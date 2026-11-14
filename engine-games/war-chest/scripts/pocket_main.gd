extends Control
## THESIS: an enduring company, built through equipment decisions and visible threats.
## OWN-WORLD: warm stone, olive standards, ink controls, brick enemies, ochre orders.
## STORY: defend the gate, recover a rune, pack it, use its power in the next battle.
## FIRST VIEWPORT: an open crossing, visible families, live threats and actor-context orders.
## FORM: owner-selected The Last Crossing; elevated world, persistent company and camp.
const Game=preload("res://scripts/story_game.gd")
const Story=preload("res://scripts/pocket_story.gd")
const Art=preload("res://scripts/pocket_art.gd")
const Field=preload("res://scripts/pocket_field.gd")
const Chest=preload("res://scripts/pocket_chest.gd")
const Coach=preload("res://scripts/pocket_coach.gd")
const Unlock=preload("res://scripts/pocket_unlock.gd")
const Preview=preload("res://scripts/command_preview.gd")
const SAVE="user://iron-and-ember-v2.json"
const STORY_SAVE="user://winter-wages-story-v1.json"
const SETTINGS="user://pocket-settings.cfg"
const PAPER=Color("efe8d6")
const NAVY=Color("15282b")
const BLUE=Color("294743")
const SKY=Color("c5c4a5")
const GOLD=Color("e9b85f")
const MUTED=Color("566b5c")
const CORAL=Color("c15b49")
const SHORT={"cleave":"Cleave","ward":"Shield","volley":"Volley","spark":"Storm","mend":"Heal","pin":"Pin","frost":"Freeze","rally":"Rally","gust":"Gust","bolt":"Bolt","strike":"Strike","guard":"Guard","move":"Move"}
const GEAR_EFFECT={"blade":"Rowan · Cleave hits every foe on his front.","bow":"Lysa · Volley reaches any front.","ward":"Rowan · Shield protects any ally.","cube":"Touch weapons to add 2 damage to their commands.","staff":"Merrin · Storm deals damage and cancels an attack.","flask":"Merrin · Heal restores an ally's health.","ballista":"Adds a ballista with ranged Bolt in every battle.","frost":"Lysa · Freeze deals damage and cancels an attack."}

class OrderLink extends Control:
 var battlefield
 var actor=""
 var bounds=Rect2()
 func _process(_delta):
  if battlefield.motion.active():queue_redraw()
 func _draw():
  var unit=battlefield.game.ally(actor)
  if unit.is_empty() or unit.hp<=0:return
  var at=battlefield.motion.position(actor,battlefield.unit_position(unit,false))+Vector2(0,87)
  var end=Vector2(clampf(at.x,bounds.position.x+22,bounds.end.x-22),bounds.position.y)
  if at.x>bounds.end.x:end=Vector2(bounds.end.x,clampf(at.y,bounds.position.y+12,bounds.end.y-12))
  if at.distance_to(end)>9:draw_line(at,end,Color("e9b85f",0.6),2,true)
var game=Game.new()
var field
var hud: Control
var inspection: Label
var status: Label
var page="keep"
var selected="rowan"
var chosen=""
var target=""
var battle_notice=""
var mission=0
var keep_mode="campaign"
var mastery_notice=""
var contract_id="raid"
var quest_id="scout"
var contract_tier=1
var gear="blade"
var chest
var rotation_index=0
var chest_cursor=Vector2i.ZERO
var undo={}
var guide_return="keep"
var retreat_confirm=false
var reduced_motion=false
var muted=false
var coaching=true
var unlock_seen=""
var demo=false
var save_path=SAVE
var legacy_save=SAVE
var story_save=STORY_SAVE
var story_open_error=""
var story_notice=""
var font=SystemFont.new()
var display_font=SystemFont.new()
var sound: AudioStreamPlayer
var card_buttons=[]
var finishing_impact=false
var finish_tween: Tween
var last_surface=""
var actor_controls=[]
var motion_was_active=false
var context_rect=Rect2(350,620,700,210)

func _ready():
 get_window().min_size=Vector2i(1152,720)
 var args=OS.get_cmdline_user_args()
 demo="--pocket-demo" in args or "--pocket-battle" in args or "--story-demo" in args
 var fresh=demo and "--banner-opening" in args
 if not demo:
  load_local_company()
  var settings=ConfigFile.new()
  if settings.load(SETTINGS)==OK:
   muted=bool(settings.get_value("play","muted",false))
   reduced_motion=bool(settings.get_value("play","reduced_motion",false))
   coaching=bool(settings.get_value("play","coaching",true))
 font.font_names=PackedStringArray(["Avenir Next","Arial"]);font.font_weight=500
 display_font.font_names=PackedStringArray(["Georgia","Times New Roman"]);display_font.font_weight=700
 var t=Theme.new();t.default_font=font;t.default_font_size=18;theme=t
 field=Field.new();field.game=game;field.size=Vector2(1440,900);add_child(field)
 sound=AudioStreamPlayer.new();add_child(sound)
 if "--story-demo" in args:
  if game.enroll_story(): persist()
 elif fresh and game.enroll_opening(): game.begin(0);persist()
 elif "--pocket-battle" in args: game.begin(0)
 if not game.battle.is_empty(): page="battle"
 elif game.opening_guided() and game.opening_stage() in [1,2]: page="chest";gear="cube"
 if game.story_active() and game.campaign.story.phase in ["intro","outro","ending"] and game.battle.is_empty(): page="story"
 mission=mini(game.campaign.unlocked,game.level()-1)
 show_page()

func load_local_company():
 # Separate local slots: restoring any original company never enrolls it.
 game=Game.new()
 save_path=story_save if FileAccess.file_exists(story_save) or not FileAccess.file_exists(legacy_save) else legacy_save
 var fresh=not FileAccess.file_exists(save_path)
 game.load_from(save_path)
 if fresh and game.enroll_story(): game.save_to(save_path)
 if is_instance_valid(field): field.game=game

func rounded(fill: Color,radius=4,edge=Color(0,0,0,0),border=0) -> StyleBoxFlat:
 var s=StyleBoxFlat.new();s.bg_color=fill;s.set_corner_radius_all(mini(radius,4));s.border_color=edge;s.set_border_width_all(border)
 s.content_margin_left=12;s.content_margin_right=12;s.content_margin_top=4;s.content_margin_bottom=4
 return s

func panel(rect: Rect2,color=PAPER,radius=18):
 var p=Panel.new();p.position=rect.position;p.size=rect.size;p.mouse_filter=Control.MOUSE_FILTER_IGNORE
 p.add_theme_stylebox_override("panel",rounded(color,radius));hud.add_child(p)
 return p

func text(value: String,rect: Rect2,sz=20,color=NAVY,bold=false) -> Label:
 var l=Label.new();l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 l.add_theme_font_override("font",display_font if bold else font);l.add_theme_font_size_override("font_size",sz);l.add_theme_color_override("font_color",color)
 # Establish wrapping width before text; otherwise Label first measures at 0px
 # and retains a thousands-of-pixels minimum height for this HUD rebuild.
 l.mouse_filter=Control.MOUSE_FILTER_IGNORE;l.position=rect.position;l.size=rect.size;l.text=value;hud.add_child(l)
 l.set_meta("layout_rect",rect)
 return l

func button(value: String,rect: Rect2,action: Callable,primary=false,disabled=false) -> Button:
 var b=Button.new();b.text=value;b.position=rect.position;b.size=rect.size;b.disabled=disabled
 b.add_theme_stylebox_override("normal",rounded(GOLD if primary else PAPER,4,Color("b5aa90"),1))
 b.add_theme_stylebox_override("hover",rounded(GOLD.lightened(0.1) if primary else Color("e4d9bf"),4,NAVY,1))
 b.add_theme_stylebox_override("pressed",rounded(GOLD))
 b.add_theme_stylebox_override("disabled",rounded(Color("ddd5c5")))
 b.add_theme_stylebox_override("focus",rounded(Color(0,0,0,0),16,NAVY,3))
 b.add_theme_color_override("font_color",NAVY)
 b.add_theme_color_override("font_hover_color",NAVY)
 b.add_theme_color_override("font_pressed_color",NAVY)
 b.add_theme_color_override("font_focus_color",NAVY)
 b.add_theme_color_override("font_disabled_color",MUTED)
 b.add_theme_font_override("font",font);b.add_theme_font_size_override("font_size",18)
 b.button_down.connect(func():
  if reduced_motion or b.disabled: return
  var previous=b.get_meta("press_tween") if b.has_meta("press_tween") else null
  if previous: previous.kill()
  b.self_modulate=Color(0.93,0.89,0.80)
  var press=b.create_tween();b.set_meta("press_tween",press)
  press.tween_property(b,"self_modulate",Color.WHITE,0.14))
 b.pressed.connect(action);hud.add_child(b);return b

func icon(id: String,rect: Rect2,color=BLUE):
 var a=Art.new();a.kind=id;a.tint=color;a.illustrated=true;a.position=rect.position;a.size=rect.size;hud.add_child(a);return a

func show_page():
 if reduced_motion and finishing_impact: cancel_combat_animation()
 var focused=get_viewport().gui_get_focus_owner()
 var keep_focus=focused.get_meta("focus_key",focused.text) if focused is Button else ""
 if hud: remove_child(hud);hud.queue_free()
 hud=Control.new();hud.size=Vector2(1440,900);hud.mouse_filter=Control.MOUSE_FILTER_IGNORE;add_child(hud)
 inspection=null;card_buttons=[];actor_controls=[]
 field.battle_view=page=="battle";field.selected=selected;field.card=chosen;field.highlighted=target;field.reduced_motion=reduced_motion;field.queue_redraw()
 field.story_scene=page=="story"
 field.surface=page
 field.world_state=""
 if page!="battle": field.clear_motion()
 match page:
  "keep": keep_page()
  "chest": chest_page()
  "shop": shop_page()
  "guide": guide_page()
  "story": Story.scene(self)
  "journal": Story.journal(self)
  "story_banners": Story.banners(self)
  "battle":
   if game.battle.phase=="playing" or finishing_impact: battle_page()
   else: reward_page()
 var surface=page+(game.battle.get("phase","") if page=="battle" and not finishing_impact else "")
 if surface!=last_surface and page=="battle" and not finishing_impact and game.battle.phase=="victory" and not reduced_motion:
  for node in hud.get_children():
   if node.get_script()==Art:
    node.pivot_offset=node.size/2;node.scale=Vector2.ONE*0.94
    node.create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT).tween_property(node,"scale",Vector2.ONE,0.32)
 last_surface=surface
 var compact_save_warning=game.save_error!="" and (page=="battle" or page=="guide" or game.campaign.has("story"))
 status=null
 if ((page!="battle" and (page!="story" or story_notice!="")) or mastery_notice!="") and not compact_save_warning:
  panel(Rect2(20,857,1400,32),PAPER,10)
  status=text(game.save_error if game.save_error!="" else (mastery_notice if mastery_notice!="" else game.message),Rect2(34,859,1240,30),18 if mastery_notice!="" else 15,CORAL if game.save_error!="" else MUTED)
 if game.save_error=="": text("Practice session" if demo else "Local play",Rect2(1292,872,128,22),12,MUTED)
 if keep_focus!="":
  var restored=false
  for node in hud.get_children():
   if node is Button and node.get_meta("focus_key",node.text)==keep_focus and not node.disabled:
    node.grab_focus();restored=true;break
  if not restored and (keep_focus.begins_with("command_") or keep_focus.begins_with("actor_") or keep_focus.begins_with("hero_")):
   for card in card_buttons:
    if not card.disabled: card.grab_focus();restored=true;break
   if not restored:
    for node in hud.get_children():
     if node is Button and node.get_meta("focus_key","")=="end_turn": node.grab_focus();break
  if not restored and keep_focus.begins_with("story_"):
   var preferred=["story_continue","story_march","story_reward_continue","story_retry","story_choice_reinforce","story_choice_ward","story_choice_hold"]
   for key in preferred:
    for node in hud.get_children():
     if node is Button and not node.disabled and node.get_meta("focus_key","")==key:
      node.grab_focus();restored=true;break
    if restored: break
   if not restored:
    for node in hud.get_children():
     if node is Button and not node.disabled: node.grab_focus();break
 if page=="story" and get_viewport().gui_get_focus_owner()==null:
  for node in hud.get_children():
   if node is Button and not node.disabled and (node.get_meta("focus_key","")=="story_continue" or str(node.get_meta("focus_key","")).begins_with("story_choice_")):
    node.grab_focus();break
 # Restoring a control's focus must not replace the latest action/error feedback.
 if page=="battle" and chosen=="move" and not game.battle.has("story"): inspect("")
 elif page=="battle" and (battle_notice!="" or chosen!="move"): inspect(default_detail())
 if game.save_error!="":
  if compact_save_warning:
   panel(Rect2(20,864,1400,34),PAPER,10)
   var warning=text("SAVING DISABLED · This session will not be kept. Open Menu for recovery details.",Rect2(34,866,1360,30),18,CORAL,true)
   warning.set_meta("save_warning",true)
  else:
   panel(Rect2(20,824,1400,71),PAPER,10)
   text("SAVING DISABLED — this session will not be kept. "+game.save_error,Rect2(34,829,1360,62),18,CORAL,true)

func persist():
 if not demo: game.save_to(save_path)

func navigate(to: String):
 cancel_combat_animation()
 mastery_notice=""
 story_notice=""
 page=to;chosen="";target="";retreat_confirm=false;show_page()

func header(title: String,sub: String):
 text(title,Rect2(48,30,900,60),38,NAVY,true)
 text(sub,Rect2(50,99,1030,38),19,MUTED)
 text("Lv %d  ·  %d gold" % [game.level(),game.campaign.gold],Rect2(1137,34,270,35),21,NAVY,true)
 if page!="guide":
  button("How to play",Rect2(1203,87,185,44),func():guide_return=page;navigate("guide"))

func keep_page():
 if game.story_active(): Story.road(self);return
 var first=game.level()==1
 var starter_packed=game.campaign.placements.has_all(["blade","bow","ward","cube"])
 header("War Chest", ("Your gear is already packed. Start the first battle; learn by giving real orders." if starter_packed else "Stored gear gives no commands. Pack equipment before battle, or fight with your current loadout.") if first else "Your company, your next move. Inspect a hero to see their growth.")
 text("A company worth\ncommanding.",Rect2(57,202,700,126),47,NAVY,true)
 var early=game.opening_guided()
 for i in range(4):
  var modes=["campaign","quests","contracts","banners"]
  var labels=["Campaign","Side quests","War contracts","Banners"]
  var mode_button=button(labels[i]+("\nAfter battle 2" if early and i>0 else ("\nLevel 2" if first and i>0 else "")),Rect2(56+i*152,351,143,48),func():keep_mode=modes[i];show_page(),keep_mode==modes[i],(first or early) and i>0)
  mode_button.add_theme_font_size_override("font_size",15)
 var members=["rowan","lysa","fen"]
 if game.campaign.mage: members.append("merrin")
 for i in range(members.size()):
  var id=members[i];var x=155+i*147
  icon("owl" if id=="fen" and game.campaign.pet=="owl" else id,Rect2(x,425,190,210))
  text({"rowan":"Rowan","lysa":"Lysa","fen":"Fen" if game.campaign.pet=="wolf" else "Talon","merrin":"Merrin"}[id],Rect2(x+47,650,140,30),19,NAVY,true)
  var mastery_button=button(game.mastery_progress(id),Rect2(x+22,685,141,57),func():show_mastery(id))
  mastery_button.add_theme_font_size_override("font_size",16)
  mastery_button.set_meta("focus_key","mastery_"+id)
  mastery_button.tooltip_text=game.mastery_effect(id,maxi(1,game.mastery_rank(id)))
 button("Pack equipment",Rect2(56,752,284,66),func():navigate("chest"))
 if not game.campaign.has("story"):
  button("Begin story mode",Rect2(56,163,320,48),start_new_story,true).tooltip_text="Start the winter-wages story with a new company. Your original company keeps its separate save."
 elif game.campaign.has("story"):
  button("The wages are home · Journal",Rect2(56,163,393,48),func():navigate("journal"))
 button("Explore all systems" if early else "Recruit & upgrade",Rect2(361,752,291,66),func():
  if early: game.skip_opening();persist();show_page()
  else: navigate("shop"))
 if keep_mode=="quests":
  quests_panel()
  return
 if keep_mode=="contracts":
  contracts_panel()
  return
 if keep_mode=="banners":
  banners_panel()
  return
 var m=Game.SIEGES[mission]
 text("Chapter %d · Battle %d of 6 · %s" % [int(mission/2)+1,mission+1,m.kind.to_lower()],Rect2(871,226,507,33),18,MUTED)
 text(m.name,Rect2(870,276,493,100),35,NAVY,true)
 text(m.desc,Rect2(873,387,485,74),23,NAVY)
 text("+%d gold  ·  %s" % [m.gold if game.campaign.wins[mission]==0 else int(m.gold/2),"new level" if game.level()<6 and game.campaign.wins[mission]==0 else "veteran rewards"],Rect2(873,473,474,37),19,MUTED)
 for i in range(6):
  var locked=i>game.campaign.unlocked or i>=game.level()
  var b=button(str(i+1),Rect2(872+i*83,542,62,48),func():mission=i;show_page(),mission==i,locked)
  b.tooltip_text=Game.SIEGES[i].name+(" · win the previous battle first" if locked else "")
 text("Win to advance. Side quests offer optional gear and routes.",Rect2(873,600,460,48),17,MUTED)
 button("Play first battle  →" if first else "Start battle  →",Rect2(872,657,493,67),start_battle,true)
 text("Next: "+Game.REWARDS[game.level()+1][0] if game.level()<6 else "Try a different company build in veteran battles.",Rect2(872,765,500,66),19,NAVY)

func start_battle():
 mastery_notice=""
 unlock_seen=""
 var started=game.begin_quest(quest_id) if keep_mode=="quests" else (game.begin_contract(contract_id,contract_tier) if keep_mode=="contracts" else game.begin(mission))
 if started: page="battle";selected="rowan";chosen="";battle_notice="";undo={};persist()
 show_page()

func start_new_story():
 var next=Game.new()
 if FileAccess.file_exists(story_save) and not demo:
  next.load_from(story_save)
  if next.save_locked: story_open_error=next.save_error;game.message="Story save kept unchanged. Open How to play for recovery details.";show_page();return
 else:
  if not next.enroll_story(): return
 game=next;field.game=game;save_path=story_save;story_open_error=""
 selected="rowan";undo={};persist();navigate("battle" if not game.battle.is_empty() else ("story" if game.story_active() and game.campaign.story.phase!="prepare" else "keep"))

func story_advance():
 if not game.advance_story(): story_notice=game.message;show_page();return
 story_notice=""
 persist()
 if game.campaign.story.phase=="prepare":
  if game.story_node().id=="ashen": gear="cube";chest_cursor=Vector2i(1,0);navigate("chest")
  else: navigate("keep")
 elif game.campaign.story.phase=="complete": navigate("keep")
 else: navigate("story")

func story_choose(id: String):
 if game.choose_story_option(id): story_advance()
 else: story_notice=game.message;show_page()

func start_story_battle():
 if game.begin_story_node():
  page="battle";selected="rowan";chosen="";target="";battle_notice="";undo={};unlock_seen="";persist()
 show_page()
 if page=="battle" and game.battle.phase=="playing":
  for b in card_buttons:
   if not b.disabled: b.grab_focus();break
  # Keyboard focus starts on a card, but the opening instruction stays readable.
  inspect(default_detail())

func open_original_company():
 if demo or save_path!=story_save or not FileAccess.file_exists(legacy_save): return
 var original=Game.new();original.load_from(legacy_save)
 game=original;field.game=game;save_path=legacy_save;selected="rowan";undo={}
 mission=mini(game.campaign.unlocked,game.level()-1)
 navigate("battle" if not game.battle.is_empty() else "keep")

func quests_panel():
 text("The company's side-story",Rect2(871,217,510,48),29,NAVY,true)
 text("%d/6 complete · optional, no daily timers" % game.campaign.journey.completed.size(),Rect2(874,276,493,29),17,MUTED)
 var i=0
 for id in Game.QUESTS:
  var q=Game.QUESTS[id];var locked=game.quest_lock(id)
  var label="%d · %s%s" % [q.chapter,q.name," ✓" if game.quest_done(id) else ""]
  var b=button(label,Rect2(872,318+i*49,493,42),func():quest_id=id;show_page(),quest_id==id)
  b.add_theme_font_size_override("font_size",17)
  b.tooltip_text=locked if locked!="" else q.desc
  i+=1
 var selected_quest=Game.QUESTS[quest_id];var reason=game.quest_lock(quest_id)
 text(reason if reason!="" else selected_quest.desc,Rect2(874,616,493,95),18,NAVY)
 text(("Replay: half gold; no repeat relic or XP." if game.quest_done(quest_id) else selected_quest.reward),Rect2(874,715,493,57),17,MUTED)
 button("Quest locked" if reason!="" else ("Replay side quest  →" if game.quest_done(quest_id) else "Start side quest  →"),Rect2(872,779,493,57),start_battle,true,reason!="")

func contracts_panel():
 text("War contracts",Rect2(871,217,510,54),34,NAVY,true)
 text("%d renown · %d contracts won" % [game.war().renown,game.war().contracts],Rect2(874,277,493,29),18,MUTED)
 contract_tier=mini(contract_tier,game.max_tier())
 for i in range(5):
  var b=button("Tier %d" % (i+1),Rect2(873+i*100,320,94,44),func():contract_tier=i+1;show_page(),contract_tier==i+1,i>=game.max_tier())
  b.tooltip_text="Tier %d · %s" % [i+1,game.tier_unlock_text(i+1)]
 if game.max_tier()<5:
  text("Next: "+game.tier_unlock_text(game.max_tier()+1),Rect2(874,367,493,24),16,MUTED)
 var i=0
 for id in Game.CONTRACTS:
  var info=game.contract_info(id,contract_tier)
  var y=393+i*75
  button("%s · %d gold" % [Game.CONTRACTS[id].name,info.gold+game.banner_rank("fortune")*10],Rect2(872,y,493,49),func():contract_id=id;show_page(),contract_id==id)
  i+=1
 var info=game.contract_info(contract_id,contract_tier)
 text(info.desc,Rect2(874,628,491,83),19,NAVY)
 button("Take contract  →" if game.level()>=2 else "Contracts unlock at level 2",Rect2(872,730,493,61),start_battle,true,game.level()<2)
 text("Win: +%d renown, 35 XP and one banner. No time limit." % contract_tier,Rect2(873,801,495,48),17,MUTED)

func banners_panel():
 text("Your company banner",Rect2(871,217,510,54),31,NAVY,true)
 text("Equip one, up to rank III. Bonuses need the matching commands unlocked and packed.",Rect2(874,278,493,60),18,MUTED)
 var i=0
 for id in Game.BANNERS:
  var rank=int(game.war().banners.get(id,0));var y=344+i*75
  var b=button(Game.BANNERS[id].name+(" · Rank %d" % rank if rank else " · Not found"),Rect2(872,y,493,44),func():transact(func():game.equip_banner(id)),game.war().equipped==id,rank==0)
  b.tooltip_text=game.banner_text(id,maxi(1,rank))
  text(game.banner_text(id,maxi(1,rank)),Rect2(880,y+47,484,27),16,MUTED)
  i+=1
 text("Earn your first banner by winning a battle." if game.war().equipped=="" else "Active: "+Game.BANNERS[game.war().equipped].name,Rect2(874,806,493,43),17,MUTED)

func battle_page():
 if game.battle.has("story"):
  crossing_battle_page();return
 legacy_battle_page()

func legacy_battle_page():
 var m=game.encounter()
 panel(Rect2(20,18,1400,143),PAPER)
 panel(Rect2(20,632,1400,250),PAPER)
 text("Complete the mission" if game.battle.has("quest") else ("Hold the gate" if m.kind=="DEFENSE" else "Break their line"),Rect2(46,25,530,55),38,NAVY,true)
 panel(Rect2(39,78,565,33),PAPER,8)
 text("%s  ·  %s" % [m.name,("within %d turns" % m.rounds) if game.battle.has("quest") else ("survive %d turns" % m.rounds if m.kind=="DEFENSE" else "defeat every foe")],Rect2(49,80,565,32),19,MUTED)
 if game.war().equipped!="":
  var banner=game.war().equipped
  var badge=button("%s · %d" % [Game.BANNERS[banner].name,game.banner_rank(banner)],Rect2(46,118,310,34),func():inspect(game.banner_text(banner,game.banner_rank(banner))))
  badge.tooltip_text=game.banner_text(banner,game.banner_rank(banner))
 var lesson=coach_hint()
 if not lesson.is_empty():
  panel(Rect2(380,118,808,35),PAPER,8)
  text(lesson.heading,Rect2(392,122,783,29),18,NAVY)
  button("Skip lessons",Rect2(1200,116,171,39),func():coaching=false;save_settings();show_page())
 elif game.battle_brief()!="":
  var briefing=button(game.battle_brief(),Rect2(380,118,991,35),func():inspect(game.encounter().desc+" · Optional: "+game.objective_text()))
  briefing.add_theme_font_size_override("font_size",17)
  briefing.tooltip_text=game.encounter().desc+" · Optional: "+game.objective_text()
 elif game.battle.has("objective"):
  panel(Rect2(380,118,991,35),PAPER,8)
  text("Optional · "+game.objective_text(),Rect2(392,122,972,29),18,NAVY)
 text("Turn %d  ·  %d orders" % [game.battle.round,game.battle.commands],Rect2(650,33,365,36),23,NAVY,true)
 for i in range(6+(1 if game.level()>=5 else 0)):
  panel(Rect2(660+i*33,80,22,22),GOLD if i<game.battle.commands else SKY,11)
 icon("ward",Rect2(1097,29,33,33),BLUE)
 text("%d / %d" % [game.battle.gate,game.battle.get("story",{}).get("initial_gate",30)],Rect2(1141,29,144,36),23,NAVY,true)
 text("IVO'S CART" if game.battle.get("story",{}).get("node","")=="convoy" else "YOUR GATE",Rect2(1098,75,150,25),12,MUTED,true)
 button("Menu",Rect2(1299,30,104,43),func():guide_return=page;navigate("guide"))
 var h=game.ally(selected)
 if h.is_empty() or h.hp<=0:
  for member in game.battle.heroes:
   if member.hp>0: selected=member.id;h=member;break
 field.selected=selected
 for member in game.battle.heroes:
  if member.hp>0: actor_button(member,false)
 for enemy in game.battle.enemies:
  if enemy.hp>0: actor_button(enemy,true)
 # Rules appear in one quiet line; the scene remains visible behind live controls.
 inspection=text(default_detail(),Rect2(302,642,927,57),19,NAVY)
 inspection.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
 icon("owl" if selected=="fen" and game.campaign.pet=="owl" else selected,Rect2(43,699,104,113))
 text(h.name,Rect2(164,713,159,37),25,NAVY,true)
 text("%d / %d HP" % [h.hp,h.max_hp],Rect2(164,755,160,26),16,MUTED)
 for i in range(game.battle.heroes.size()):
  var member=game.battle.heroes[i];var x=40+i*59
  var b=button("",Rect2(x,807,55,55),func():select_hero(member.id),member.id==selected,member.hp<=0)
  b.text="";b.accessibility_name=member.name;b.set_meta("focus_key","hero_"+member.id)
  icon("owl" if member.id=="fen" and game.campaign.pet=="owl" else member.id,Rect2(x+5,812,45,43))
  b.tooltip_text=member.name+" · select [%d] · " % (i+1)+Coach.role_text(game,member.id)
  b.accessibility_description=b.tooltip_text+". Switches your command cards without spending orders."
 var list=game.cards(selected).duplicate()
 if selected!="ballista": list.append("move")
 var width=866.0/list.size()
 for i in range(list.size()):
  var id=list[i];var cost=(0 if game.free_march() else 1) if id=="move" else Game.COMMANDS[id].cost
  var error=game.move_reason(selected) if id=="move" else game.reason(selected,id)
  var x=341+i*width
  var y=701 if chosen==id else 708
  var b=button(SHORT[id],Rect2(x,y,width-12,145),func():choose_card(id),false,error!="")
  b.text="";b.accessibility_name=SHORT[id]+" · %d orders" % cost
  b.set_meta("focus_key","command_"+id)
  var card_style=rounded(GOLD if chosen==id else PAPER,4,NAVY if chosen==id else Color("b5aa90"),2 if chosen==id else 1)
  b.add_theme_stylebox_override("normal",card_style)
  icon(id,Rect2(x+(width-12)/2-34,y+24,68,67),BLUE)
  var name_label=text(SHORT[id],Rect2(x+4,y+102,width-20,34),21,MUTED if error!="" else NAVY,true)
  name_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
  panel(Rect2(x+width-48,y+9,27,27),SKY if error!="" else GOLD,4)
  var cost_label=text(str(cost),Rect2(x+width-48,y+10,27,25),16,NAVY,true)
  cost_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
  b.tooltip_text=error if error!="" else detail(id)
  b.accessibility_description=b.tooltip_text
  b.mouse_entered.connect(func():inspect(error if error!="" else detail(id)))
  b.focus_entered.connect(func():inspect(error if error!="" else detail(id)))
  b.mouse_exited.connect(func():inspect(default_detail()))
  card_buttons.append(b)
 var end_turn=button("Continue  →" if finishing_impact else "End turn  →",Rect2(1233,753,171,67),resolve_turn,true)
 end_turn.set_meta("focus_key","end_turn")
 button("Undo [Z]",Rect2(1253,828,133,31),undo_action,false,undo.is_empty())
 if chosen=="move":
  inspection.text=""
  for lane in range(3):
   var count=0
   for member in game.battle.heroes:
    if member.hp>0 and member.lane==lane: count+=1
   button("Front %d" % (lane+1),Rect2(493+lane*180,649,167,43),func():move_to(lane),false,h.lane==lane or count>=2)

func crossing_panel(rect: Rect2):
 var p=panel(rect,Color("12272b"),4)
 p.add_theme_stylebox_override("panel",rounded(Color("12272b"),4,Color("4a6a62"),1))
 return p

func crossing_button(value: String,rect: Rect2,action: Callable,primary=false,disabled=false) -> Button:
 var b=button(value,rect,action,primary,disabled)
 for state in ["normal","hover","pressed"]:
  var fill=(GOLD if primary else Color("253a3e")) if state=="normal" else (GOLD.lightened(0.1) if primary else Color("35554d"))
  b.add_theme_stylebox_override(state,rounded(fill,4,GOLD if primary else Color("668078"),1))
 b.add_theme_stylebox_override("disabled",rounded(Color("233632"),4,Color("3b524c"),1))
 b.add_theme_stylebox_override("focus",rounded(Color.TRANSPARENT,4,GOLD,3))
 for state in ["font_color","font_hover_color","font_pressed_color","font_focus_color"]:
  b.add_theme_color_override(state,NAVY if primary else PAPER)
 b.add_theme_color_override("font_disabled_color",Color("90a49a"))
 return b

func crossing_battle_page():
 var m=game.encounter()
 var story_id=game.battle.story.node
 crossing_panel(Rect2(24,24,939,140))
 text(m.name.to_upper(),Rect2(43,39,901,26),15,GOLD)
 var goals={"gate":"Keep the crossing open","ashen":"Break the roadblock","scout":"Bring Ivo home","convoy":"Escort Ivo’s supply cart","bell":"Keep the signal bell standing","relic":"Recover the archive seal","beacons":"Light all three watchfires","frost":"Defeat the marshal and his guard","citadel":"Clear the iron patrol","winter":"Hold Winterwatch","crown":"Defeat the Crown’s company","engine":"Recover and extract the pay chest"}
 var goal=goals.get(story_id,m.name)
 if story_id=="winter" and game.battle.story.decisions.get("citadel","")=="evacuate":goal="Escort Winterwatch’s families"
 # Leaves the panel's right side for lesson progress and Skip lessons.
 text(goal,Rect2(43,73,740,43),29,PAPER,true)
 var objective=game.battle_brief()
 if objective!="":
  if story_id in ["ashen","frost","crown"]:objective="Clear every foe. "+objective
  elif story_id in ["gate","bell","winter"] and not (story_id=="winter" and game.battle.story.decisions.get("citadel","")=="evacuate"):objective="Hold %d enemy turns. " % m.rounds+objective
 if objective=="": objective="Protect the gate and company for %d enemy turns." % m.rounds if m.kind=="DEFENSE" else "Clear the enemy company. Keep your companions alive."
 text(objective,Rect2(44,117,899,43),16,Color("b9c9b7"))
 crossing_panel(Rect2(987,24,429,140))
 text("Turn %d%s" % [game.battle.round," / %d" % m.rounds if m.rounds>0 else ""],Rect2(1007,39,247,33),23,PAPER,true)
 text("%s  %d / %d" % ["Cart" if story_id=="convoy" else "Gate",game.battle.gate,game.battle.story.initial_gate],Rect2(1007,81,255,28),20,PAPER)
 crossing_button("Menu",Rect2(1303,38,93,42),func():guide_return=page;navigate("guide"))
 if story_id=="gate":
  var phases=4 if game.battle.phase=="victory" else mini(3,maxi(0,game.battle.round-1))
  text("Families crossing · %d / 4 stages safe" % phases,Rect2(1008,117,388,26),15,Color("b9c9b7"))
 elif game.war().equipped!="":
  var banner=game.war().equipped
  text(Game.BANNERS[banner].name+" · "+str(game.banner_rank(banner)),Rect2(1008,117,389,26),15,Color("b9c9b7"))
 var h=game.ally(selected)
 if h.is_empty() or h.hp<=0:
  for member in game.battle.heroes:
   if member.hp>0: selected=member.id;h=member;break
 field.selected=selected
 for member in game.battle.heroes:
  if member.hp>0: actor_button(member,false)
 for enemy in game.battle.enemies:
  if enemy.hp>0: actor_button(enemy,true)
 # The companion controls are a small, named company, not a stack of cards.
 crossing_panel(Rect2(24,715,354,133))
 text("SELECT WHO ACTS · FREE",Rect2(39,727,326,23),13,Color("b9c9b7"))
 var company=game.battle.heroes
 var slot=324.0/company.size()
 for i in range(company.size()):
  var member=company[i];var x=39+i*slot
  var b=crossing_button("",Rect2(x,756,slot-7,79),func():select_hero(member.id),member.id==selected,member.hp<=0)
  b.accessibility_name=member.name;b.set_meta("focus_key","hero_"+member.id)
  icon("owl" if member.id=="fen" and game.campaign.pet=="owl" else member.id,Rect2(x+5,760,slot-17,43))
  text(str(i+1),Rect2(x+5,758,18,20),12,NAVY if member.id==selected else PAPER).set_meta("label_for",b.get_instance_id())
  var name=text("Siege" if member.id=="ballista" else member.name,Rect2(x+2,811,slot-11,24),14,NAVY if member.id==selected else PAPER)
  name.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
  name.set_meta("label_for",b.get_instance_id())
  b.tooltip_text=member.name+" · select [%d] · " % (i+1)+Coach.role_text(game,member.id)
  b.accessibility_description=b.tooltip_text+". Switching is free; the whole company deploys."
 crossing_panel(Rect2(1101,708,315,140))
 text("%d orders shared by everyone" % game.battle.commands,Rect2(1119,720,285,27),18,GOLD)
 var total=7 if game.level()>=5 else 6
 for i in range(total):panel(Rect2(1120+i*34,756,23,7),GOLD if i<game.battle.commands else Color("405650"),2)
 var clear_label="Move the families onward →" if story_id=="gate" else "Advance to the next turn →"
 var next="Continue →" if finishing_impact else ("Let enemies act →" if game.battle.enemies.any(func(enemy):return enemy.hp>0) else clear_label)
 var end_turn=crossing_button(next,Rect2(1118,783,281,48),resolve_turn,true)
 end_turn.add_theme_font_size_override("font_size",17);end_turn.set_meta("focus_key","end_turn")
 # One contextual order surface stays beside the selected actor's crossing.
 var at=field.unit_position(h,false)
 context_rect=Rect2(clampf(at.x-290,400,1075-650),620,650,228)
 var link=OrderLink.new();link.battlefield=field;link.actor=selected;link.bounds=context_rect;link.size=Vector2(1440,900);link.mouse_filter=Control.MOUSE_FILTER_IGNORE;hud.add_child(link)
 crossing_panel(context_rect)
 var x=context_rect.position.x
 text(h.name,Rect2(x+17,629,119,35),24,PAPER,true)
 text(Coach.role_text(game,selected),Rect2(x+141,635,352,27),16,PAPER)
 text("%d HP%s" % [h.hp," · %d block" % h.shield if h.shield>0 else ""],Rect2(x+503,635,130,26),15,Color("b9c9b7"))
 inspection=text(default_detail(),Rect2(x+17,670,617,53),17,PAPER)
 var list=game.cards(selected).duplicate()
 if selected!="ballista":list.append("move")
 var signature=[]
 for id in ["rally","ward","cleave","frost","volley","mend","spark","pin","gust","bolt"]:
  if id in list:signature.append(id)
 if signature.is_empty():signature=["strike","guard"]
 if signature.size()>3:signature=signature.slice(0,3)
 var basics=list.filter(func(id):return id not in signature)
 var width=616.0/signature.size()
 if chosen!="move":
  for i in range(signature.size()):
   crossing_order(signature[i],Rect2(x+17+i*width,731,width-10,49),true)
 for i in range(basics.size()):
  crossing_order(basics[i],Rect2(x+17+i*112,790,102,38),false)
 var undo_control=crossing_button("Undo [Z]",Rect2(x+506,790,127,38),undo_action,false,undo.is_empty())
 undo_control.add_theme_font_size_override("font_size",16)
 var lesson=coach_hint()
 if not lesson.is_empty():
  var heading=text(lesson.heading,Rect2(505,38,440,26),16,GOLD)
  heading.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT
  var skip=crossing_button("Skip lessons",Rect2(803,74,142,34),func():coaching=false;save_settings();show_page())
  skip.add_theme_font_size_override("font_size",14)
 if chosen=="move":
  inspection.text="Choose a crossing. One move per companion each turn."
  for lane in range(3):
   var count=game.battle.heroes.filter(func(member):return member.hp>0 and member.lane==lane).size()
   var move=crossing_button("Front %d" % (lane+1),Rect2(x+17+lane*205,731,195,49),func():move_to(lane),true,h.lane==lane or count>=2)
   move.tooltip_text=Game.FRONTS[lane]+": "+("full" if count>=2 else "move here")

func crossing_order(id: String,rect: Rect2,signature: bool):
 var cost=(0 if game.free_march() else 1) if id=="move" else Game.COMMANDS[id].cost
 var error=game.move_reason(selected) if id=="move" else game.reason(selected,id)
 var b=crossing_button("%s · %d" % [SHORT[id],cost],rect,func():choose_card(id),chosen==id or (chosen=="" and signature and id=="ward" and int(game.campaign.get("lessons",15))==0),error!="")
 b.add_theme_font_size_override("font_size",18 if signature else 16)
 b.set_meta("focus_key","command_"+id)
 b.accessibility_name="%s · %d order%s" % [SHORT[id],cost,"" if cost==1 else "s"]
 b.tooltip_text=error if error!="" else detail(id)
 b.accessibility_description=b.tooltip_text
 b.mouse_entered.connect(func():inspect(error if error!="" else detail(id)))
 b.focus_entered.connect(func():inspect(error if error!="" else detail(id)))
 b.mouse_exited.connect(func():inspect(default_detail()))
 card_buttons.append(b)

func open_story_pack(id="cube"):
 gear=id;rotation_index=0;chest_cursor=Vector2i(1,0);navigate("chest")

func actor_button(u: Dictionary,enemy: bool):
 var b=button("",field.unit_rect(u,enemy),func():on_actor(u.id))
 b.text="";b.accessibility_name=u.name;b.set_meta("focus_key","actor_"+u.id)
 actor_controls.append({"button":b,"unit":u,"enemy":enemy})
 for state in ["normal","hover","pressed","disabled"]: b.add_theme_stylebox_override(state,rounded(Color(0,0,0,0),12))
 for state in ["font_color","font_hover_color","font_pressed_color"]: b.add_theme_color_override(state,Color(0,0,0,0))
 var info=target_detail(u.id) if chosen!="" and chosen!="move" else actor_detail(u,enemy)
 b.tooltip_text=info
 b.accessibility_description=info
 b.mouse_entered.connect(func():field.highlighted=u.id;field.queue_redraw();inspect(info))
 b.focus_entered.connect(func():field.highlighted=u.id;field.queue_redraw();inspect(info))
 b.mouse_exited.connect(func():field.highlighted=target;field.queue_redraw();inspect(default_detail()))
 b.focus_exited.connect(func():
  if field.highlighted==u.id:
   field.highlighted=target;field.queue_redraw();inspect(default_detail()))

func actor_detail(u: Dictionary,enemy: bool) -> String:
 var info=u.name+" · %d/%d HP" % [u.hp,u.max_hp]
 if enemy: info+=" · "+game.threat(u)+" · "+game.enemy_detail(u)
 else:
  info+=" · "+Coach.role_text(game,u.id)
  if u.shield>0: info+=" · %d block" % u.shield
 if not enemy and u.id in Game.MASTERY_HEROES:
  var rank=game.mastery_rank(u.id)
  info+=" · Mastery %s: " % Game.RANK_NAMES[rank]+game.mastery_effect(u.id,rank) if rank>0 else " · "+game.mastery_progress(u.id).replace("\n"," · ")
 return info

func inspect(value: String):
 if is_instance_valid(inspection): inspection.text="" if page=="battle" and chosen=="move" and not game.battle.has("story") else value

func default_detail() -> String:
 if finishing_impact: return "Victory!" if game.battle.phase=="victory" else "Your company is safe."
 if battle_notice!="": return battle_notice
 var lesson=coach_hint()
 if not lesson.is_empty(): return lesson.body
 if chosen!="": return detail(chosen)+"  ·  Choose a target."
 if selected=="merrin" and not game.campaign.placements.has("staff"):
  return "Merrin selected [4]. Strike or Guard works now. His staff is stored; pack it at camp for Storm. All companions share orders."
 return game.ally(selected).get("name","Companion")+" selected · "+Coach.role_text(game,selected)+". Choose an order, then its target."

func coach_hint() -> Dictionary:
 if coaching and game.opening_guided() and game.opening_stage()==2 and game.battle.get("mission",-1)==1 and not game.campaign.opening.rune_used:
  if chosen!="": return {}
  for option in [["blade","rowan","cleave"],["bow","lysa","volley"]]:
   if not game.empowered(option[0]): continue
   for enemy in game.battle.enemies:
    if game.reason(option[1],option[2],enemy.id)=="":
     return {"heading":"Your build is ready · test the linked weapon", "body":"%s gains +2 rune damage. Select %s, then %s and a foe %s." % [SHORT[option[2]],game.ally(option[1]).name,SHORT[option[2]],"on this front" if option[1]=="rowan" else "on any front"]}
  if game.empowered("blade") or game.empowered("bow"):
   return {"heading":"Your rune stays with the company", "body":"No linked attack is available now. Use other orders or End turn; fallen heroes recover after battle."}
 return Coach.hint(game,selected,chosen) if coaching else {}

func target_detail(id: String) -> String:
 if game.battle.has("story") and chosen not in ["","move"]:
  return Preview.description(game,selected,chosen,id)
 var reason=game.reason(selected,chosen,id)
 if reason!="": return reason
 var enemy=game.foe(id)
 if not enemy.is_empty() and chosen!="gust":
  var damage=game.damage_against(selected,chosen,enemy)
  if enemy.get("trait","")=="armored": damage=maxi(1,damage-2)
  var effect=" · hits every foe on this front" if chosen=="cleave" else (" · stuns: cancels its next attack" if chosen in ["spark","pin","frost"] else "")
  return "%s → %s · %d damage after armor%s" % [SHORT[chosen],enemy.name,damage,effect]
 var ally=game.ally(id)
 return detail(chosen)+" → "+(enemy.name if not enemy.is_empty() else ally.name)

func detail(id: String) -> String:
 if id=="move": return "Move to another front · %s · once per hero per turn." % ("free with Scout's pennant" if game.free_march() else "1 order")
 return game.card_text(selected,id).replace("\n"," · ")

func select_hero(id: String):
 if game.ally(id).hp<=0: return
 selected=id;chosen="";target="";battle_notice="";show_page()

func choose_card(id: String):
 chosen=id;target="";battle_notice=""
 if id!="move" and Game.COMMANDS[id].target=="self": on_actor(selected)
 else: show_page()

func on_actor(id: String):
 if finishing_impact: finish_combat_animation();return
 if chosen=="":
  if not game.ally(id).is_empty(): select_hero(id)
  else: inspect(actor_detail(game.foe(id),true))
  return
 if chosen=="move": return
 var before=game.snapshot()
 var played=game.play(selected,chosen,id)
 if played:
  game.message=game.ally(selected).name+" used "+SHORT[chosen]+"."
  undo=before;field.animate_change(before.battle,selected,chosen);chosen="";target="";tone(450);persist()
  hold_final_impact()
 battle_notice="" if played and not reduced_motion and not coach_hint().is_empty() else game.message
 show_page()

func move_to(lane: int):
 var before=game.snapshot()
 if game.reposition(selected,lane):
  undo=before;field.animate_change(before.battle,selected,"move");chosen="";target="";persist()
 battle_notice=game.message
 show_page()

func cycle_target():
 if chosen in ["","move"]: return
 var targets=[]
 for u in game.battle.heroes+game.battle.enemies:
  if game.reason(selected,chosen,u.id)=="": targets.append(u.id)
 if targets.is_empty(): return
 target=targets[posmod(targets.find(target)+1,targets.size())]
 field.highlighted=target;field.queue_redraw()
 inspect(target_detail(target)+" · F confirms")

func resolve_turn():
 if finishing_impact: finish_combat_animation();return
 if page!="battle" or game.battle.phase!="playing": return
 var before=game.battle.duplicate(true)
 for e in before.enemies: e.motion_power=game.attack_power(e)
 game.resolve()
 before.motion_attack_state=game.resolution_start;before.motion_absorbed=game.hazard_absorbed
 before.motion_enemy_turn=game.enemy_turn_started
 field.animate_change(before,"","",true);hold_final_impact()
 chosen="";target=""
 battle_notice=game.message if reduced_motion else (turn_feedback(field.motion.summary) if coach_hint().is_empty() else "")
 undo={};tone(160);persist();show_page()

func turn_feedback(summary: String) -> String:
 if summary=="": return game.message
 var results=summary.split(" · ")
 var shown=PackedStringArray()
 var length=0
 for result in results:
  if length+result.length()>145: break
  shown.append(result);length+=result.length()+3
 var feedback="Enemy turn · "+" · ".join(shown)
 if shown.size()<results.size(): feedback+=" · +%d more; inspect troops." % (results.size()-shown.size())
 return feedback

func hold_final_impact():
 if game.battle.phase=="playing" or reduced_motion or not field.motion.active(): return
 finishing_impact=true
 if finish_tween: finish_tween.kill()
 finish_tween=create_tween()
 finish_tween.tween_interval(maxf(0.39,field.motion.last_impact())+0.18)
 finish_tween.tween_callback(finish_combat_animation)

func cancel_combat_animation():
 finishing_impact=false
 if finish_tween: finish_tween.kill();finish_tween=null
 field.clear_motion()

func finish_combat_animation():
 cancel_combat_animation()
 if page=="battle": show_page()

func undo_action():
 if undo.is_empty() or game.battle.phase!="playing": return
 cancel_combat_animation()
 game.restore(undo);undo={};chosen="";target="";game.message="Last command undone.";battle_notice=game.message;persist();show_page()

func reward_page():
 field.battle_view=false;field.queue_redraw()
 if game.battle.has("story"): Story.reward(self);return
 var won=game.battle.phase=="victory"
 if won and game.opening_stage()==1 and game.opening_guided():
  opening_reward_page();return
 header("Victory secured" if won else "The company survives.",game.encounter().name)
 icon("rowan",Rect2(129,288,370,370));icon("fen",Rect2(353,416,222,222))
 if won and game.battle.has("quest_reward"):
  text("Side quest secured",Rect2(80,173,590,35),23,NAVY,true)
  text(game.battle.quest_reward,Rect2(80,218,570,63),18,NAVY)
 if won and game.battle.get("mastery_rules",false):
  var awards=game.battle.get("mastery_awards",[])
  var complete=true
  for h in game.battle.heroes:
   if h.id in Game.MASTERY_HEROES and game.mastery_wins(h.id)<9: complete=false
  text("Mastery unlocked · select a hero" if not awards.is_empty() else ("A fully mastered company" if complete else "Mastery grows with every victory"),Rect2(80,684,590,35),23,NAVY,true)
  if awards.is_empty(): text("Every deployed hero has reached mastery III. Try new equipment and banner combinations." if complete else "Each deployed hero gains a mastery win, up to 9. Ranks unlock at 2, 5 and 9 wins.",Rect2(80,730,570,103),19,MUTED)
  else:
   var i=0
   for h in game.battle.heroes:
    var rank=game.rank_from_wins(game.mastery_wins(h.id))
    if rank<=int(h.get("mastery",0)): continue
    button("%s · Mastery %s" % [h.name,Game.RANK_NAMES[rank]],Rect2(80+(i%2)*284,730+int(i/2)*57,272,47),func():show_mastery(h.id))
    i+=1
  text("Bonus objective: +%d gold included" % game.battle.objective.gold if game.battle.objective.paid else "Bonus objective missed · no penalty",Rect2(706,271,630,27),17,MUTED)
 text("+%d gold" % game.battle.reward if won else "Your company is safe.",Rect2(703,229,658,65),40,NAVY,true)
 if won and game.battle.has("contract"): text("+%d renown · %d total" % [game.battle.contract.tier,game.war().renown],Rect2(706,301,634,30),20,BLUE,true)
 var new_level=int(game.battle.new_level)
 if new_level>0:
  text("Level %d unlocked" % new_level,Rect2(706,332,520,44),28,BLUE,true)
  var seal=Unlock.new();seal.level=new_level;seal.position=Vector2(1250,320);seal.size=Vector2(72,72)
  var key="%d:%d:%d" % [new_level,game.battle.mission,game.campaign.xp]
  seal.reduced_motion=reduced_motion or unlock_seen==key;unlock_seen=key;hud.add_child(seal)
  text(Coach.unlock_text(new_level),Rect2(706,382,634,81),18,NAVY)
 elif not won: text(game.battle.get("quest_failure","Your heroes, gear and gold are kept. Try shielding a threatened ally, stunning a sapper or moving to protect your gate."),Rect2(704,365,622,165),24,NAVY)
 if game.has_loot():
  text("Choose one banner upgrade",Rect2(706,468,643,39),24,NAVY,true)
  for i in range(game.battle.loot.size()):
   var id=game.battle.loot[i];var rank=int(game.war().banners.get(id,0));var y=520+i*78
   button(Game.BANNERS[id].name+(" · Rank %d" % (rank+1) if rank<3 else " · Mastered: +40 gold"),Rect2(706,y,611,45),func():transact(func():game.claim_banner(id)))
   text(game.banner_text(id,mini(3,rank+1)),Rect2(715,y+47,601,29),17,MUTED)
  text("Bonuses apply when their commands are unlocked and packed.",Rect2(715,749,601,23),16,MUTED)
 elif won:
  text(game.battle.get("claim_message","Banner claimed. Choose your active banner at the keep.") if game.battle.get("loot_claimed",false) else "Victory secured. Plan your next expedition at the keep.",Rect2(706,510,611,130),23,NAVY)
 button("Choose a banner first" if game.has_loot() else "Back to the keep  →",Rect2(706,774,611,62),return_to_keep,true,game.has_loot())

func return_to_keep():
 if game.battle.has("story"):
  if game.battle.phase=="victory": navigate("story");return
  if game.return_to_camp(): undo={};persist();navigate("keep")
  else: show_page()
  return
 var pack_next=game.opening_guided() and game.opening_stage()==1 and game.battle.get("phase","")=="victory"
 game.return_to_camp()
 if not game.battle.is_empty(): show_page();return
 mission=mini(game.campaign.unlocked,game.level()-1);undo={};persist()
 if pack_next: gear="cube";chest_cursor=Vector2i(1,0);navigate("chest")
 else: navigate("keep")

func opening_reward_page():
 header("The gate holds.","Your company has earned its first advantage.")
 icon("rowan",Rect2(73,276,235,328));icon("lysa",Rect2(284,299,215,305));icon("fen",Rect2(444,397,225,207))
 text("+%d gold · Company level 2" % game.battle.reward,Rect2(91,663,550,46),25,NAVY,true)
 text("The company will grow. First, make its equipment work together.",Rect2(91,721,531,81),22,MUTED)
 icon("cube",Rect2(1001,216,126,126),BLUE)
 text("Recovered: Storm rune",Rect2(744,373,600,51),32,NAVY,true)
 text("One cell. A stronger weapon.",Rect2(746,444,590,37),23,NAVY)
 text("Pack the rune beside your sword or bow. An edge-touching weapon gains +2 damage on its equipment command.",Rect2(746,503,587,118),24,NAVY)
 button("Pack the storm rune  →",Rect2(746,663,600,64),return_to_keep,true)
 button("Explore without guidance",Rect2(746,749,600,48),func():game.skip_opening();return_to_keep())

func show_mastery(id: String):
 var rank=game.rank_from_wins(game.mastery_wins(id))
 mastery_notice=("Next unlock: " if rank==0 else "Mastery %s: " % Game.RANK_NAMES[rank])+game.mastery_effect(id,maxi(1,rank))
 if page=="battle": mastery_notice+=" Applies next battle."
 show_page()

func chest_page():
 if game.story_active():crossing_chest_page();return
 var teaching=game.opening_guided() and game.opening_stage() in [1,2]
 header("One cell. A stronger weapon." if teaching else "Pack your next victory", "Place the storm rune in a free cell sharing an edge with the sword or bow." if teaching else "Equipment gives you commands. Fit your chosen loadout into the chest.")
 button("← Company road" if game.story_active() else "← Keep",Rect2(46,157,239 if game.story_active() else 148,44),func():navigate("keep"))
 chest=Chest.new();chest.game=game;chest.selected=gear;chest.item_rotation=rotation_index;chest.cursor=chest_cursor;chest.position=Vector2(110,329);chest.scale=Vector2.ONE*1.1;hud.add_child(chest)
 chest.selected_item.connect(func(id):gear=id;rotation_index=int(game.campaign.placements[id][2]);chest_cursor=chest.cursor;show_page())
 chest.placed.connect(func(id,x,y,r):gear=id;rotation_index=r;chest_cursor=Vector2i(x,y);game.place(id,x,y,r);persist();show_page())
 text("6 × 5 chest",Rect2(112,247,540,49),29,NAVY,true)
 text("Olive dot = rune-linked · +2 command damage",Rect2(112,299,585,28),16,MUTED)
 text("Your equipment · pack or leave behind",Rect2(777,247,581,46),26,NAVY,true)
 var i=0
 for id in game.campaign.items:
  var packed=game.campaign.placements.has(id)
  var b=button(Game.ITEMS[id].name+("\nPacked" if packed else "\nStored"),Rect2(779+(i%2)*299,310+int(i/2)*62,286,55),func():gear=id;rotation_index=int(game.campaign.placements.get(id,[0,0,0])[2]);show_page(),gear==id)
  b.add_theme_font_size_override("font_size",17)
  i+=1
 text(Game.ITEMS[gear].name,Rect2(780,727,572,34),23,NAVY,true)
 text(GEAR_EFFECT.get(gear,Game.ITEMS[gear].desc),Rect2(780,771,575,62),19,NAVY)
 button("Rotate [R]",Rect2(112,788,204,46),func():chest.rotate_preview();rotation_index=chest.item_rotation)
 button("Store item",Rect2(334,788,205,46),func():game.stow(gear);persist();show_page())
 text("Drag to pack · WASD: cursor · R: rotate · F: place",Rect2(112,724,572,49),17,MUTED)
 if game.story_active():
  var ready=game.campaign.story.phase=="prepare"
  var linked=game.empowered("blade") or game.empowered("bow")
  var needs_rune=game.story_node().id=="ashen" and not linked
  button("Pack a rune beside a weapon" if needs_rune else "March with the company →",Rect2(777,158,578,53),start_story_battle,true,not ready or needs_rune)
  if needs_rune and gear=="cube": chest.suggested=rune_suggestions();chest.queue_redraw()
  if teaching: text("+2 Cleave damage" if game.empowered("blade") else ("+2 Volley damage" if game.empowered("bow") else "Select the rune, then an outlined cell beside a weapon."),Rect2(112,206,570,38),18,BLUE)
 elif teaching:
  var linked=game.empowered("blade") or game.empowered("bow")
  button("Test this loadout  →" if linked else "Pack a rune beside a weapon",Rect2(777,158,578,53),func():mission=1;keep_mode="campaign";start_battle(),true,not linked)
  if not linked and gear=="cube":
   chest.suggested=rune_suggestions();chest.queue_redraw()
  text("+2 Cleave damage"+(" · +2 Volley damage" if game.empowered("bow") else "") if game.empowered("blade") else ("+2 Volley damage" if game.empowered("bow") else "Select the storm rune, then an outlined free cell beside a weapon."),Rect2(112,206,570,38),18,BLUE)
 button("Explore without guidance",Rect2(235,158,397,43),func():game.skip_opening();persist();navigate("keep"))

func crossing_chest_page():
 field.world_state="camp"
 var linked=game.empowered("blade") or game.empowered("bow")
 var needs_rune=game.story_node().id=="ashen" and not linked
 text("AT THE COMPANY FIRE",Rect2(72,30,870,28),15,GOLD,true)
 text("One cell. A stronger weapon." if needs_rune else "Prepare the company",Rect2(70,68,975,65),38,PAPER,true)
 text("Fit the earned rune beside a weapon: its linked command gains 2 damage." if needs_rune else "Packed equipment gives commands. Stored equipment travels with you, but has no effect in battle.",Rect2(72,139,1050,55),20,PAPER)
 crossing_button("How to play",Rect2(1184,40,206,46),func():guide_return=page;navigate("guide"))
 crossing_button("← Company road",Rect2(72,205,251,44),func():navigate("keep"))
 crossing_button("Pack a rune beside a weapon" if needs_rune else "March with the company →",Rect2(765,205,622,44),start_story_battle,true,game.campaign.story.phase!="prepare" or needs_rune)
 crossing_panel(Rect2(72,270,610,570));crossing_panel(Rect2(749,270,639,570))
 text("The company chest",Rect2(110,284,540,39),27,PAPER,true)
 panel(Rect2(103,333,474,397),PAPER,8)
 chest=Chest.new();chest.game=game;chest.selected=gear;chest.item_rotation=rotation_index;chest.cursor=chest_cursor;chest.position=Vector2(110,340);chest.scale=Vector2.ONE*1.1;hud.add_child(chest)
 chest.selected_item.connect(func(id):gear=id;rotation_index=int(game.campaign.placements[id][2]);chest_cursor=chest.cursor;show_page())
 chest.placed.connect(func(id,x,y,r):gear=id;rotation_index=r;chest_cursor=Vector2i(x,y);game.place(id,x,y,r);persist();show_page())
 if needs_rune and gear=="cube":chest.suggested=rune_suggestions();chest.queue_redraw()
 var linked_text=PackedStringArray()
 if game.empowered("blade"): linked_text.append("+2 Cleave damage")
 if game.empowered("bow"): linked_text.append("+2 Volley damage")
 var stored=game.campaign.items.has(gear) and not game.campaign.placements.has(gear)
 var chest_hint=" · ".join(linked_text) if not linked_text.is_empty() else "Outlined cells link the rune to a weapon."
 if stored and not (needs_rune and gear=="cube"):
  var spot=first_fit(gear)
  if spot.is_empty(): chest_hint=Game.ITEMS[gear].name+" does not fit. Store something to make room."
  else:
   chest.suggested=spot;chest.queue_redraw()
   chest_hint="Outlined: where it fits. Click its top-left cell to pack."
 text(chest_hint,Rect2(110,736,560,27),17,GOLD)
 text("Drag · WASD: cursor · R: rotate · F: place",Rect2(110,764,550,20),14,PAPER)
 crossing_button("Rotate [R]",Rect2(110,790,204,38),func():chest.rotate_preview();rotation_index=chest.item_rotation)
 crossing_button("Store item",Rect2(334,790,205,38),func():game.stow(gear);persist();show_page())
 text("Choose your equipment",Rect2(778,286,580,35),26,PAPER,true)
 var columns=3 if game.campaign.items.size()>10 else 2
 var item_width=181 if columns==3 else 286
 var i=0
 for id in game.campaign.items:
  var packed=game.campaign.placements.has(id)
  var b=crossing_button(Game.ITEMS[id].name+("\nPacked" if packed else "\nStored"),Rect2(779+(i%columns)*(item_width+13),337+int(i/columns)*62,item_width,55),func():gear=id;rotation_index=int(game.campaign.placements.get(id,[0,0,0])[2]);show_page(),gear==id)
  b.add_theme_font_size_override("font_size",16);i+=1
 text(Game.ITEMS[gear].name,Rect2(779,725,579,32),23,GOLD,true)
 text(GEAR_EFFECT.get(gear,Game.ITEMS[gear].desc),Rect2(779,767,579,59),18,PAPER)

func first_fit(id: String) -> Array:
 # Read-only: the model's placement rule decides; nothing is packed here.
 for y in range(5):
  for x in range(6):
   if game.can_place(id,x,y,rotation_index):
    var out=[]
    for cell in game.cells(id,[x,y,rotation_index]): out.append(Vector2i(cell[0],cell[1]))
    return out
 return []

func rune_suggestions() -> Array:
 var result=[]
 for y in range(5):
  for x in range(6):
   if not game.can_place("cube",x,y,0): continue
   for id in ["blade","bow"]:
    if not game.campaign.placements.has(id): continue
    for cell in game.cells(id,game.campaign.placements[id]):
     if absi(cell[0]-x)+absi(cell[1]-y)==1 and Vector2i(x,y) not in result: result.append(Vector2i(x,y))
 return result

func transact(action: Callable):
 action.call();persist();show_page()

func shop_page():
 header("The quartermaster", "Company gold repairs our gear. The households' wages stay in their sealed chest." if game.story_active() else "Spend earned gold on heroes and equipment. No real-money purchases.")
 button("← Company road" if game.story_active() else "← Keep",Rect2(46,157,239 if game.story_active() else 148,44),func():navigate("keep"))
 text("Upgrade & equip",Rect2(50,236,650,47),30,NAVY,true)
 var i=0
 for id in Game.ITEMS:
  if id in Game.RELICS: continue
  var owned=game.campaign.items.has(id);var unlocked=game.level()>=game.item_level(id);var y=309+i*62
  icon(id,Rect2(44,y,39,39));text(Game.ITEMS[id].name,Rect2(97,y,236,37),19,NAVY,true)
  var b: Button
  if owned:
   var rank=int(game.campaign.items[id]);var locked=id in ["cube","ballista"] or rank>=game.forge_limit()
   var label="Not upgradeable" if id in ["cube","ballista"] else ("+%d · Complete" % rank if rank==3 else ("+%d · Next rank locked" % rank if locked else "+%d · Upgrade %d gold" % [rank,30+rank*25]))
   b=button(label,Rect2(340,y,312,44),func():transact(func():game.upgrade(id)),false,locked or game.campaign.gold<30+rank*25)
  else:
   var story_lock=game.story_item_lock(id)
   b=button("Joins after the archive" if story_lock!="" else ("Buy · %d gold" % Game.ITEMS[id].price if unlocked else "Level %d" % game.item_level(id)),Rect2(340,y,312,44),func():transact(func():game.buy(id)),false,story_lock!="" or not unlocked or game.campaign.gold<Game.ITEMS[id].price)
  b.tooltip_text=game.story_item_lock(id) if game.story_item_lock(id)!="" else GEAR_EFFECT[id]
  i+=1
 icon("merrin",Rect2(758,264,160,183))
 text("Merrin",Rect2(962,286,410,45),31,NAVY,true)
 text("Joins free after the archive.\nPack his staff to command Storm." if game.story_active() and not game.campaign.mage else ("Deploys every battle. Select with 4.\nPack staff: Storm; medicine: Heal." if game.campaign.mage else "Recruit for 60 company gold.\nPack his staff to command Storm."),Rect2(964,344,430,76),20,MUTED)
 button("Already recruited" if game.campaign.mage else ("Joins after the Sunken Reliquary" if game.story_active() else ("Recruit · 60 gold" if game.level()>=2 else "Recruit at level 2")),Rect2(778,473,601,52),func():transact(func():game.recruit()),true,game.story_active() or game.campaign.mage or game.level()<2 or game.campaign.gold<60)
 text("Choose one lasting talent",Rect2(779,559,599,39),23,NAVY,true)
 button("Battlecraft · +1 damage",Rect2(779,611,599,44),func():transact(func():game.choose_talent("might")),game.campaign.talent=="might",game.level()<2 or game.campaign.talent!="")
 button("Resolve · +4 health",Rect2(779,669,599,44),func():transact(func():game.choose_talent("resolve")),game.campaign.talent=="resolve",game.level()<2 or game.campaign.talent!="")
 button("Fen · Wolf",Rect2(779,765,284,47),func():transact(func():game.choose_pet("wolf")),game.campaign.pet=="wolf")
 var pet_lock=game.story_pet_lock("owl")
 button("Talon · After the story" if pet_lock!="" else ("Talon · Owl" if game.level()>=6 else "Owl · Level 6"),Rect2(1084,765,294,47),func():transact(func():game.choose_pet("owl")),game.campaign.pet=="owl",pet_lock!="" or game.level()<6).tooltip_text=pet_lock

func guide_page():
 header("Field manual", "No timer. Take your time with every turn.")
 button("← Back to game",Rect2(47,158,234,48),func():navigate(guide_return))
 var authored=game.campaign.has("story")
 var sections=[
  ["Select & command","All companions deploy. Bottom portraits or 1–5 switch freely. Choose a card, then a target. Each card works once per hero per turn. Six shared orders; seven from level 5."],
  ["Joining the company","Merrin joins free after the Sunken Reliquary. He deploys next battle; pack his staff for Storm. Fen stays until homecoming; then you can choose Talon." if authored else "Recruit Merrin for 60 company gold from level 2. His staff arrives in storage; pack it for Storm. From level 6, choose Fen or Talon at the quartermaster."],
  ["Company levels",("Five milestones give +70 XP; each level adds 2 max HP to companions. Other wins give gold and mastery. "+Coach.story_progress(game)) if authored else "Company levels use 70 XP each, up to level 6. Each adds 2 max HP to companions. Victories unlock equipment, talents and skills; buy or pack gear when required."],
  ["Pack & mastery","Pack gear for commands; storage has no effect. Rowan's Shield protects any ally. End turn: enemies act, orders refresh. Each companion's mastery at 2/5/9 victories applies next battle."]]
 if story_open_error!="": sections[3]=["Story recovery",story_open_error+" The story file is kept unchanged. "+("The original company save also needs recovery." if game.save_locked else "Your original company remains playable.")]
 elif game.save_error!="": sections[3]=["Save recovery",game.save_error+" The file is kept unchanged. Move a copy aside before starting a replacement; this session cannot overwrite it."]
 for i in range(4):
  var x=50+(i%2)*704;var y=260+int(i/2)*190
  text(sections[i][0],Rect2(x,y,629,40),30,NAVY,true)
  text(sections[i][1],Rect2(x,y+55,625,123),18 if (game.save_error!="" or story_open_error!="") and i==3 else 23,NAVY)
 button("Sound off" if muted else "Sound on",Rect2(49,720,206,49),func():muted=not muted;save_settings();show_page())
 button("Less motion" if reduced_motion else "Motion on",Rect2(274,720,225,49),func():reduced_motion=not reduced_motion;save_settings();show_page())
 var can_replay=game.level()==1 and int(game.campaign.get("lessons",15))==15
 button("Replay lessons" if can_replay else ("Lessons on" if coaching else "Lessons off"),Rect2(518,720,206,49),func():
  if can_replay: game.campaign.lessons=0;coaching=true;persist()
  else: coaching=not coaching
  save_settings();show_page())
 text("1–5: hero · Tab / Enter: controls · T / F: target\nSpace: end turn · Z: undo · Esc: cancel / back",Rect2(746,719,645,67),18,MUTED)
 if not demo:
  if save_path==story_save and FileAccess.file_exists(legacy_save):
   button("Open original company",Rect2(746,788,645,47),open_original_company).tooltip_text="Switch to the original separate save. Your story progress is kept."
  elif save_path==legacy_save:
   button("Continue story mode" if FileAccess.file_exists(story_save) else "Begin story mode · Separate company",Rect2(746,788,645,47),start_new_story)
 if guide_return=="battle" and not game.battle.is_empty() and game.battle.phase=="playing":
  button("Withdraw — keep gear, forfeit reward?" if retreat_confirm else "Retreat to keep",Rect2(51,788,610,47),func():
   if retreat_confirm: game.retreat();persist();navigate("battle")
   else: retreat_confirm=true;show_page(),retreat_confirm)

func save_settings():
 if demo: return
 var settings=ConfigFile.new();settings.set_value("play","muted",muted);settings.set_value("play","reduced_motion",reduced_motion)
 settings.set_value("play","coaching",coaching)
 if settings.save(SETTINGS)!=OK: game.message="Could not save preferences. They still apply for this session."

func tone(frequency: float):
 if muted: return
 var data=PackedByteArray();data.resize(4410)
 for i in range(2205): data.encode_s16(i*2,int(sin(TAU*frequency*i/22050)*pow(1.0-float(i)/2205,2)*2000))
 var wave=AudioStreamWAV.new();wave.format=AudioStreamWAV.FORMAT_16_BITS;wave.mix_rate=22050;wave.data=data;sound.stop();sound.stream=wave;sound.play()

func _process(_delta):
 if not is_instance_valid(field): return
 var active=field.motion.active()
 if active or motion_was_active:
  for entry in actor_controls:
   if is_instance_valid(entry.button): entry.button.position=field.unit_rect(entry.unit,entry.enemy).position
 motion_was_active=active

func _input(event):
 if not event is InputEventKey or not event.pressed or event.echo: return
 if finishing_impact and event.keycode in [KEY_SPACE,KEY_ENTER]:
  finish_combat_animation();get_viewport().set_input_as_handled();return
 if event.keycode==KEY_ESCAPE:
  if page=="guide": navigate(guide_return)
  elif chosen!="": chosen="";target="";show_page()
  elif page=="story": guide_return="story";navigate("guide")
  elif page!="keep" and page!="battle": navigate("keep")
 elif page=="chest" and event.keycode in [KEY_W,KEY_A,KEY_S,KEY_D,KEY_R,KEY_F]:
  chest.keyboard(event.keycode);rotation_index=chest.item_rotation;chest_cursor=chest.cursor
 elif page=="battle" and game.battle.phase=="playing":
  if event.keycode==KEY_SPACE: resolve_turn()
  elif event.keycode==KEY_Z: undo_action()
  elif event.keycode==KEY_T: cycle_target()
  elif event.keycode==KEY_F and target!="": on_actor(target)
  elif event.keycode>=KEY_1 and event.keycode<=KEY_5:
   var index=event.keycode-KEY_1
   if index<game.battle.heroes.size(): select_hero(game.battle.heroes[index].id)
  else: return
 else: return
 get_viewport().set_input_as_handled()
