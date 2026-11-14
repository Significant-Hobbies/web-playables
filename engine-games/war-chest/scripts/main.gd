extends Node
const Game=preload("res://scripts/game.gd")
const Board=preload("res://scripts/board.gd")
const Chest=preload("res://scripts/chest.gd")
const INK=Color("152323")
const PANEL=Color("203030")
const IVORY=Color("f1e7cf")
const MUTED=Color("b9c2b3")
const BRASS=Color("d9b978")
const TEAL=Color("7cbeb7")
const DANGER=Color("ed9278")
var game=Game.new()
var selected="rowan"
var order="move"
var page="campaign"
var selected_item="blade"
var rotation=0
var save_path="user://campaign-v1.json"
var root: Control
var header: HBoxContainer
var content: HBoxContainer
var side: VBoxContainer
var side_scroll: ScrollContainer
var footer: VBoxContainer
var status: Label
var preview: Label
var scene_container: SubViewportContainer
var viewport: SubViewport
var board
var chest
var body_font: SystemFont
var title_font: SystemFont
var pending_retreat=false
var testing=false
var capture_path=""
var reward_overlay: Control
var muted=false
var audio_player: AudioStreamPlayer
var undo_stack=[]
var keyboard_cell=[1,5]
var help_dialog: AcceptDialog
var camp_panel: PanelContainer

func _ready():
 DisplayServer.window_set_min_size(Vector2i(1152,720))
 for arg in OS.get_cmdline_user_args():
  if arg=="--test-mode": testing=true
  if arg.begins_with("--capture="): capture_path=arg.trim_prefix("--capture=")
 if testing: save_path="user://visual-test-"+str(OS.get_process_id())+".json"
 audio_player=AudioStreamPlayer.new()
 add_child(audio_player)
 game.load_from(save_path)
 if testing and "--test-battle" in OS.get_cmdline_user_args(): game.start_mission(0)
 body_font=SystemFont.new()
 body_font.font_names=PackedStringArray(["Avenir Next","Arial"])
 body_font.font_weight=400
 title_font=SystemFont.new()
 title_font.font_names=PackedStringArray(["Georgia","Times New Roman"])
 build_shell()
 help_dialog=AcceptDialog.new()
 help_dialog.title="Field manual"
 help_dialog.dialog_text="Command a hero with 1–5 or click their portrait. Choose an order, then a tile or miniature. Each hero has 2 action points per round.\n\nTeal tiles: legal targets. Brass base: selected hero. Red ! marker: an enemy will strike that tile after End round—even if you move away. Stone and water block travel; stone also blocks ranged attacks.\n\nW/A/S/D moves the targeting cursor; F commits the selected order. Z undoes your last order before ending the round. Space ends the round. Q/E rotates the table; mouse wheel zooms.\n\nWar chest: drag packed gear to move it, or select gear and click a cell. R rotates the selected shape. Rune bonuses require edge adjacency.\n\nEvery first-clear mission grants a level until level 6, with new playable unlocks. Defeat never removes your gear or progress.\n\nSaves are local and automatic after each order."
 add_child(help_dialog)
 refresh()
 if capture_path!="":
  await get_tree().create_timer(2.0).timeout
  get_viewport().get_texture().get_image().save_png(capture_path)
  print("CAPTURE: "+capture_path)

func sound(kind: String):
 if muted: return
 var sample=PackedByteArray()
 var rate=22050
 var duration=0.18 if kind!="victory" else 0.9
 var frequency={"move":220.0,"strike":85.0,"guard":330.0,"victory":523.25,"click":440.0}.get(kind,390.0)
 for i in range(int(rate*duration)):
  var t=float(i)/rate
  var envelope=pow(1.0-t/duration,2)*minf(t*100,1)
  var f=frequency*(1.0+0.5*floor(t*5)) if kind=="victory" else frequency*(1.0-t*0.5)
  var value=(sin(TAU*f*t)+0.25*sin(TAU*f*2*t))*envelope*0.16
  sample.append_array(PackedInt32Array([int(value*32767)]).to_byte_array().slice(0,2))
 var wav=AudioStreamWAV.new()
 wav.format=AudioStreamWAV.FORMAT_16_BITS
 wav.mix_rate=rate
 wav.data=sample
 audio_player.stream=wav
 audio_player.play()

func style(fill: Color, edge: Color=Color.TRANSPARENT, padding=14) -> StyleBoxFlat:
 var s=StyleBoxFlat.new()
 s.bg_color=fill
 s.border_color=edge
 s.set_border_width_all(1 if edge.a>0 else 0)
 s.set_corner_radius_all(4)
 s.content_margin_left=padding
 s.content_margin_right=padding
 s.content_margin_top=padding
 s.content_margin_bottom=padding
 return s

func label(text: String,size=18,color=IVORY,serif=false) -> Label:
 var l=Label.new()
 l.text=text
 l.add_theme_font_override("font",title_font if serif else body_font)
 l.add_theme_font_size_override("font_size",size)
 l.add_theme_color_override("font_color",color)
 return l

func prose(text: String,size=16,color=MUTED) -> Label:
 var l=label(text,size,color)
 l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 l.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 return l

func portrait(id: String) -> Texture2D:
 var path="res://assets/portraits/company.png"
 if not ResourceLoader.exists(path): return null
 var source=load(path)
 var index={"rowan":0,"lysa":1,"merrin":2,"fen":4 if game.campaign.pet=="owl" else 3,"boss":5}.get(id,0)
 var atlas=AtlasTexture.new()
 atlas.atlas=source
 var w=source.get_width()/3.0
 var h=source.get_height()/2.0
 atlas.region=Rect2(Vector2(index%3,int(index/3))*Vector2(w,h),Vector2(w,h))
 return atlas

func button(text: String,callback: Callable,primary=false,disabled=false) -> Button:
 var b=Button.new()
 b.text=text
 b.custom_minimum_size.y=42
 b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
 b.add_theme_font_override("font",body_font)
 b.add_theme_font_size_override("font_size",16)
 b.add_theme_color_override("font_color",INK if primary else IVORY)
 b.add_theme_color_override("font_hover_color",INK if primary else IVORY)
 b.add_theme_color_override("font_pressed_color",INK if primary else IVORY)
 b.add_theme_color_override("font_disabled_color",Color("8f9c91"))
 b.add_theme_stylebox_override("normal",style(BRASS if primary else Color("2b3d38"),Color("697363") if not primary else BRASS,12))
 b.add_theme_stylebox_override("hover",style(BRASS.lightened(0.14) if primary else Color("3b5148"),BRASS,12))
 b.add_theme_stylebox_override("pressed",style(Color("ab915d") if primary else Color("486055"),BRASS,12))
 b.add_theme_stylebox_override("disabled",style(Color("22302c"),Color("3b4941"),12))
 b.add_theme_stylebox_override("focus",style(Color(0,0,0,0),IVORY,2))
 b.disabled=disabled
 b.pressed.connect(callback)
 return b

func clear(node: Node):
 for child in node.get_children():
  node.remove_child(child)
  child.queue_free()

func column(parent: Node, separation=12) -> VBoxContainer:
 var v=VBoxContainer.new()
 v.add_theme_constant_override("separation",separation)
 parent.add_child(v)
 return v

func panel(parent: Node) -> VBoxContainer:
 var p=PanelContainer.new()
 p.add_theme_stylebox_override("panel",style(PANEL,Color("4c584d"),22))
 p.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 parent.add_child(p)
 return column(p)

func spacer(parent: Node):
 var s=Control.new()
 s.size_flags_vertical=Control.SIZE_EXPAND_FILL
 parent.add_child(s)

func build_shell():
 root=Control.new()
 root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 root.mouse_filter=Control.MOUSE_FILTER_IGNORE
 add_child(root)
 var background=ColorRect.new()
 background.color=INK
 background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 background.mouse_filter=Control.MOUSE_FILTER_IGNORE
 root.add_child(background)
 scene_container=SubViewportContainer.new()
 scene_container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 scene_container.stretch=true
 root.add_child(scene_container)
 viewport=SubViewport.new()
 viewport.size=Vector2i(1440,900)
 viewport.msaa_3d=Viewport.MSAA_4X
 viewport.render_target_update_mode=SubViewport.UPDATE_ALWAYS
 viewport.own_world_3d=true
 scene_container.add_child(viewport)
 board=Board.new()
 viewport.add_child(board)
 board.cell_clicked.connect(on_cell)
 board.cell_hovered.connect(on_hover)
 scene_container.gui_input.connect(board.input_event)
 var margins=MarginContainer.new()
 margins.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 for edge in ["left","right","top","bottom"]: margins.add_theme_constant_override("margin_"+edge,22)
 root.add_child(margins)
 margins.mouse_filter=Control.MOUSE_FILTER_IGNORE
 var layout=column(margins,16)
 layout.mouse_filter=Control.MOUSE_FILTER_IGNORE
 header=HBoxContainer.new()
 header.custom_minimum_size.y=69
 header.add_theme_constant_override("separation",28)
 header.mouse_filter=Control.MOUSE_FILTER_IGNORE
 layout.add_child(header)
 content=HBoxContainer.new()
 content.add_theme_constant_override("separation",18)
 content.size_flags_vertical=Control.SIZE_EXPAND_FILL
 content.mouse_filter=Control.MOUSE_FILTER_IGNORE
 layout.add_child(content)
 side_scroll=ScrollContainer.new()
 side_scroll.custom_minimum_size.x=385
 side_scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
 side_scroll.add_theme_stylebox_override("panel",style(Color(0.06,0.10,0.095,0.91),Color("516050"),18))
 side_scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
 content.add_child(side_scroll)
 side=column(side_scroll,14)
 side.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 side.custom_minimum_size.x=0
 footer=column(layout,10)
 footer.mouse_filter=Control.MOUSE_FILTER_IGNORE
 status=label("",16,MUTED)
 status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 status.custom_minimum_size.y=26
 layout.add_child(status)

func refresh():
 if is_instance_valid(reward_overlay): reward_overlay.queue_free();reward_overlay=null
 clear(header)
 clear(side)
 clear(footer)
 for child in content.get_children():
  if child!=side_scroll:
   content.remove_child(child)
   child.queue_free()
 scene_container.visible=true
 side.visible=true
 side_scroll.visible=true
 var space=Control.new()
 space.name="WorldSpace"
 space.mouse_filter=Control.MOUSE_FILTER_IGNORE
 space.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 content.add_child(space)
 content.move_child(space,0)
 var title=column(header,0)
 title.size_flags_horizontal=Control.SIZE_EXPAND_FILL
 title.add_child(label("WAR CHEST" if game.battle.is_empty() else Game.MISSIONS[int(game.battle.mission)].name,32,IVORY,true))
 title.add_child(label("THE ASHEN MARCH  /  a company worth keeping" if game.battle.is_empty() else "TACTICAL ORDERS · 1–5 select · WASD target · F act · Q/E orbit · wheel zoom",13,MUTED))
 if game.battle.is_empty():
  for tab in [["campaign","Campaign"],["chest","War chest"],["forge","Company & forge"]]:
   var tab_id=tab[0]
   header.add_child(button(tab[1],func(): page=tab_id; refresh(),page==tab_id))
 else:
  header.add_child(label("ROUND %d" % game.battle.round,18,BRASS))
 header.add_child(label("LV %d    ·    %d GOLD" % [game.level(),game.campaign.gold],17,BRASS))
 var audio_button=button("Sound off" if muted else "Sound on",func():muted=not muted;refresh())
 audio_button.tooltip_text="Toggle generated interface and combat sounds."
 header.add_child(audio_button)
 header.add_child(button("?",func():help_dialog.popup_centered(Vector2i(700,470))))
 if game.battle.is_empty():
  match page:
   "campaign": campaign_ui()
   "chest": chest_ui()
   "forge": forge_ui()
  board.sync(game,selected,order,true)
 else:
  battle_ui()
  board.sync(game,selected,order)
  if game.battle.phase=="victory" and int(game.battle.get("new_level",0))>0: level_up_overlay()
 show_status()

func show_status():
 status.text=game.save_error if game.save_error!="" else game.message
 status.add_theme_color_override("font_color",DANGER if game.save_error!="" else MUTED)

func persist():
 game.save_to(save_path)

func changed():
 persist()
 refresh()

func campaign_ui():
 side.custom_minimum_size.x=0
 side_scroll.custom_minimum_size.x=400
 side_scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
 side_scroll.custom_minimum_size.y=0
 side.add_child(label("The borderlands await",28,IVORY,true))
 side.add_child(prose("Choose an expedition. Every victory brings your company home stronger.",16))
 for i in range(Game.MISSIONS.size()):
  var mission=Game.MISSIONS[i]
  var v=panel(side)
  v.add_child(label("%02d   /   %s" % [i+1,mission.kind],12,BRASS))
  v.add_child(label(mission.name,21,IVORY,true))
  v.add_child(prose(mission.subtitle,15))
  var index=i
  var locked=i>game.campaign.unlocked or game.level()<i+1
  var won=int(game.campaign.wins[i])>0
  var text="Level %d · win the preceding mission" % (i+1) if locked else ("Return to battle  ·  %d gold" % int(mission.reward/2) if won else "March out  ·  %d gold" % mission.reward)
  v.add_child(button(text,func():
   if game.start_mission(index): selected="rowan";order="move"
   changed(),not locked,locked))
 var note="Rowan • Lysa • "+("Fen the wolf" if game.campaign.pet=="wolf" else "Talon the owl")+(" • Merrin" if game.campaign.mage else "  /  Merrin unlocks at level 2")
 footer.add_child(label(note,18,TEAL))
 footer.add_child(prose("Your gear and levels are safe after defeat. Completed expeditions can be replayed with stronger enemies. Gold is earned only through play.",16))
 progression_footer()

func progression_footer():
 var next=game.level()+1
 if next>Game.MAX_LEVEL:
  footer.add_child(label("LEVEL 6  ·  ALL COMPANY REWARDS UNLOCKED  ·  Veteran contracts remain replayable",14,BRASS))
  return
 var bar=ProgressBar.new()
 bar.custom_minimum_size.y=6
 bar.show_percentage=false
 bar.max_value=70
 bar.value=int(game.campaign.xp)%70
 bar.add_theme_stylebox_override("background",style(Color("304039"),Color.TRANSPARENT,0))
 bar.add_theme_stylebox_override("fill",style(BRASS,Color.TRANSPARENT,0))
 footer.add_child(bar)
 footer.add_child(label("NEXT · LEVEL %d     %s" % [next,"  /  ".join(Game.UNLOCKS[next])],14,BRASS))

func level_up_overlay():
 reward_overlay=PanelContainer.new()
 reward_overlay.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
 reward_overlay.position=(get_viewport().get_visible_rect().size-Vector2(600,440))/2
 reward_overlay.size=Vector2(600,440)
 reward_overlay.add_theme_stylebox_override("panel",style(INK,BRASS,36))
 root.add_child(reward_overlay)
 var v=column(reward_overlay,14)
 v.add_child(label("THE COMPANY GROWS",14,BRASS))
 v.add_child(label("Level %d" % game.battle.new_level,48,IVORY,true))
 v.add_child(prose("New tools. New tactics. A longer road ahead.",18))
 for reward in Game.UNLOCKS[int(game.battle.new_level)]:
  v.add_child(label("+  "+reward,20,TEAL))
 v.add_child(button("Return to camp & explore rewards",func():game.return_to_camp();page="forge";changed(),true))

func battle_ui():
 side.custom_minimum_size.x=0
 side_scroll.custom_minimum_size.x=260
 side_scroll.size_flags_vertical=Control.SIZE_SHRINK_BEGIN
 side_scroll.custom_minimum_size.y=365
 side.add_theme_constant_override("separation",8)
 var b=game.battle
 var m=Game.MISSIONS[int(b.mission)]
 side.add_child(label(m.kind+" / FIELD ORDERS",12,BRASS))
 var enemies_left=b.units.filter(func(u):return u.team=="enemy" and u.hp>0).size()
 if not game.is_defense(): side.add_child(label("OBJECTIVE · %d foes remain" % enemies_left,17,BRASS))
 if game.is_defense():
  side.add_child(label("GATE  %d / 24    ·    ROUND %d / 5" % [b.gate,b.round],17,TEAL))
 if b.phase!="playing":
  side.add_child(label("Victory" if b.phase=="victory" else "A fighting retreat",30,BRASS,true))
  side.add_child(prose("+%d gold. Your next expedition is ready." % b.reward if b.phase=="victory" else "Everyone returns to camp. Equipment, gold and experience are preserved.",18,IVORY))
  side.add_child(button("Return to camp",func():game.return_to_camp();page="campaign";changed(),true))
 else:
  var u=game.get_unit(selected)
  if u.is_empty() or u.hp<=0:
   for ally in b.units:
    if ally.team=="ally" and ally.hp>0: selected=ally.id;break
   u=game.get_unit(selected)
  var info=game.ability_info(order,selected)
  side.add_child(label("%s  /  %d AP" % [u.name,u.ap],22,TEAL,true))
  side.add_child(prose(info.desc,14,IVORY))
  preview=prose("Hover a tile to inspect the order.",15,BRASS)
  preview.custom_minimum_size.y=36
  side.add_child(preview)
  side.add_child(prose("Teal = legal target · red ! = threatened tile. Enemy attacks stay fixed this round.",13,MUTED))
  side.add_child(button("Confirm retreat" if pending_retreat else "Retreat…",func():
   if pending_retreat: game.retreat();pending_retreat=false;changed()
   else: pending_retreat=true;refresh()))
 var recent="\n".join(b.log.slice(maxi(0,b.log.size()-2)))
 footer.add_child(label(recent,13,MUTED))
 var roster=HBoxContainer.new()
 roster.add_theme_constant_override("separation",10)
 footer.add_child(roster)
 var n=0
 for u in b.units:
  if u.team!="ally": continue
  n+=1
  var id=u.id
  var text="%d  %s   %d HP  ·  %d AP" % [n,u.name,u.hp,u.ap]
  var choice=button(text,func(): selected=id;order="move" if id!="ballista" else "strike";refresh(),id==selected,u.hp<=0 or b.phase!="playing")
  choice.icon=portrait(id) if id!="ballista" else null
  choice.expand_icon=true
  choice.add_theme_constant_override("icon_max_width",58)
  choice.custom_minimum_size.y=70
  choice.icon_alignment=HORIZONTAL_ALIGNMENT_LEFT
  choice.size_flags_horizontal=Control.SIZE_EXPAND_FILL
  roster.add_child(choice)
 roster.add_child(button("Undo  [Z]",undo_order,false,undo_stack.is_empty() or b.phase!="playing"))
 var cards=HBoxContainer.new()
 cards.add_theme_constant_override("separation",10)
 footer.add_child(cards)
 for a in game.abilities(selected):
  var ability=a
  var info=game.ability_info(a,selected)
  var u=game.get_unit(selected)
  var text=info.name+"\n%d AP" % info.cost
  if info.damage>0: text+="  ·  %d damage" % info.damage
  var card=button(text,func():
   order=ability
   if ability in ["guard","rally"]:perform_order(game.get_unit(selected).pos)
   refresh(),order==a,u.ap<info.cost or a in u.used or b.phase!="playing")
  card.tooltip_text=info.desc+"\nRange: %d tiles" % info.range
  card.custom_minimum_size.y=76
  card.size_flags_horizontal=Control.SIZE_EXPAND_FILL
  cards.add_child(card)
 var end=button("End round  →\n[Space]",finish_round,true,b.phase!="playing")
 end.custom_minimum_size=Vector2(160,76)
 cards.add_child(end)

func coordinate(p: Array) -> String:
 return String.chr(65+int(p[0]))+str(int(p[1])+1)

func chest_ui():
 scene_container.visible=false
 side.visible=false
 side_scroll.visible=false
 content.get_node("WorldSpace").queue_free()
 var left=panel(content)
 left.add_child(label("The quartermaster's chest",30,IVORY,true))
 left.add_child(prose("Pack what you take into battle. Select gear on the right, then click an anchor cell. R rotates its shape.",17))
 chest=Chest.new()
 chest.game=game
 chest.selected=selected_item
 chest.item_rotation=rotation
 left.add_child(chest)
 chest.placement_requested.connect(func(id,x,y,r):game.place(id,x,y,r);changed())
 chest.item_selected.connect(func(id):selected_item=id;rotation=int(game.campaign.placements[id][2]);refresh())
 var actions=HBoxContainer.new()
 actions.add_theme_constant_override("separation",12)
 left.add_child(actions)
 actions.add_child(button("Rotate  ↻  [R]",rotate_item))
 actions.add_child(button("Store selected gear",func():game.stow(selected_item);changed()))
 var item=Game.ITEMS[selected_item]
 left.add_child(label(item.name,24,Color(item.color),true))
 left.add_child(prose(item.desc,17,IVORY))
 if game.empowered(selected_item): left.add_child(prose("Storm-linked: this weapon gains +2 damage and chains 2 damage to a nearby foe.",16,TEAL))
 var right=panel(content)
 right.get_parent().custom_minimum_size.x=410
 right.add_child(label("Owned equipment",26,IVORY,true))
 right.add_child(prose("Stored items stay safe at camp. Only packed items grant combat abilities.",16))
 for id in game.campaign.items:
  var key=id
  var packed=game.campaign.placements.has(id)
  var text="%s  +%d    ·    %s" % [Game.ITEMS[id].name,game.campaign.items[id],"PACKED" if packed else "STORED"]
  var choice=button(text,func():selected_item=key;rotation=int(game.campaign.placements.get(key,[0,0,0])[2]);refresh(),selected_item==id)
  choice.custom_minimum_size.y=58
  choice.tooltip_text=Game.ITEMS[id].desc
  right.add_child(choice)
 spacer(right)
 right.add_child(prose("The storm rune affects edge-adjacent weapons, never diagonals. The starting rune already empowers Rowan's Emberblade.",16,TEAL))
 footer.add_child(label("PREPARATION IS PART OF THE BATTLE",13,BRASS))

func rotate_item():
 rotation=posmod(rotation+1,4)
 refresh()
 game.message="Rotated. Click a chest cell to place the selected shape."
 show_status()

func forge_ui():
 scene_container.visible=false
 side.visible=false
 side_scroll.visible=false
 content.get_node("WorldSpace").queue_free()
 var left=panel(content)
 left.add_child(label("A company worth keeping",30,IVORY,true))
 left.add_child(prose("Rowan leads. Lysa watches the treeline. Fen stays close. There is room at the fire for one more.",18))
 left.add_child(label("Company level %d   ·   %d / 70 XP" % [game.level(),int(game.campaign.xp)%70],21,BRASS))
 left.add_child(prose("Every level grants +2 maximum health to each companion on the next expedition. At level 2, choose a permanent talent.",16))
 left.add_child(button("Merrin has joined the company" if game.campaign.mage else ("Merrin unlocks at level 2" if game.level()<2 else "Recruit Merrin + storm staff  ·  60 gold"),func():game.recruit();changed(),true,game.campaign.mage or game.campaign.gold<60 or game.level()<2))
 left.add_child(prose("Merrin is a storm mage with a ranged basic attack. His staff adds Storm bolt when packed; field medicine adds healing.",16))
 for pair in [["might","Battlecraft  ·  +1 basic damage"],["resolve","Iron resolve  ·  +4 maximum health"]]:
  var talent=pair[0]
  left.add_child(button(pair[1]+("  ✓" if game.campaign.talent==talent else ""),func():game.choose_talent(talent);changed(),game.campaign.talent==talent,game.level()<2 or game.campaign.talent!=""))
 spacer(left)
 left.add_child(label("The forge",26,IVORY,true))
 left.add_child(prose("Each rank adds +2 to the equipment's special damage, shielding or healing. Basic attacks are unchanged.",16))
 for id in game.campaign.items:
  if id in ["cube","ballista"]: continue
  var key=id
  var rank=int(game.campaign.items[id])
  var cost=30+rank*25
  left.add_child(button("%s +%d  →  %s" % [Game.ITEMS[id].name,rank,"Next rank locked" if rank>=game.forge_limit() else "+%d  ·  %d gold" % [rank+1,cost]],func():game.upgrade(key);changed(),false,rank>=game.forge_limit() or game.campaign.gold<cost))
 var right=panel(content)
 right.get_parent().custom_minimum_size.x=420
 right.add_child(label("The travelling merchant",28,IVORY,true))
 right.add_child(prose("A few good tools. No mystery chests. No real money.",17))
 for id in ["staff","flask","ballista"]:
  var key=id
  var item=Game.ITEMS[id]
  right.add_child(label(item.name,23,Color(item.color),true))
  right.add_child(prose(item.desc,17))
  var owned=game.campaign.items.has(id)
  var locked=game.level()<game.item_level(id)
  right.add_child(button("Owned" if owned else ("Unlocks at level %d" % game.item_level(id) if locked else "Buy  ·  %d gold" % item.price),func():game.buy(key);changed(),not owned,owned or game.campaign.gold<item.price or locked))
 if game.level()>=6:
  right.add_child(button("Travel with Fen" if game.campaign.pet=="owl" else "Travel with Talon the owl",func():game.choose_pet("wolf" if game.campaign.pet=="owl" else "owl");changed(),true))
 spacer(right)
 right.add_child(prose("New gear goes into storage. Visit the war chest and pack it before marching out.",17,BRASS))
 footer.add_child(label("EVERY UPGRADE IS EARNED IN PLAY",13,BRASS))
 progression_footer()

func on_cell(cell: Array):
 if game.battle.is_empty() or game.battle.phase!="playing" or not game.valid_cell(cell): return
 var u=game.at(cell)
 if not u.is_empty() and u.team=="ally" and order not in ["ward","mend"]:
  selected=u.id
  order="strike" if selected=="ballista" else "move"
  refresh()
  return
 perform_order(cell)

func perform_order(cell: Array):
 var old=game.snapshot()
 if game.act(selected,order,cell):
  undo_stack.append(old)
  sound("victory" if game.battle.phase=="victory" else ("move" if order=="move" else "strike"))
  changed()
  board.feedback(old.battle,game.battle)
 else: show_status()

func undo_order():
 if undo_stack.is_empty() or game.battle.is_empty() or game.battle.phase!="playing":return
 game.restore(undo_stack.pop_back())
 game.message="Last order undone."
 changed()

func finish_round():
 var old=game.snapshot()
 if game.end_round():
  undo_stack.clear()
  sound("victory" if game.battle.phase=="victory" else "guard")
  pending_retreat=false
  changed()
  board.feedback(old.battle,game.battle)

func on_hover(cell: Array):
 if game.battle.is_empty() or game.battle.phase!="playing" or not is_instance_valid(preview): return
 if not game.valid_cell(cell): preview.text="Hover a tile to inspect the order.";return
 var error=game.action_error(selected,order,cell)
 var info=game.ability_info(order,selected)
 preview.text=coordinate(cell)+"  ·  "+(error if error!="" else "%s · %d AP%s" % [info.name,info.cost," · %d damage" % info.damage if info.damage>0 else ""])
 var unit=game.at(cell)
 if not unit.is_empty() and unit.team=="enemy":
  var intent=unit.intent
  preview.text="%s · %d/%d HP\nNext: %s at %s\n%s" % [unit.name,unit.hp,unit.max_hp,intent.kind,coordinate(intent.target),preview.text]

func _unhandled_key_input(event):
 if not event is InputEventKey or not event.pressed or event.echo: return
 if event.keycode==KEY_F12:
  var path="res://artifacts/design/"+(page if game.battle.is_empty() else "battle")+"-"+str(get_viewport().get_visible_rect().size.x)+".png"
  get_viewport().get_texture().get_image().save_png(path)
  return
 if game.battle.is_empty():
  if page=="chest" and event.keycode==KEY_R: rotate_item()
  return
 if event.keycode==KEY_Z:undo_order();return
 if event.keycode in [KEY_Q,KEY_E]:board.orbit(-0.25 if event.keycode==KEY_Q else 0.25);return
 if event.keycode in [KEY_W,KEY_A,KEY_S,KEY_D]:
  var delta={KEY_W:[0,-1],KEY_A:[-1,0],KEY_S:[0,1],KEY_D:[1,0]}[event.keycode]
  keyboard_cell=[clampi(keyboard_cell[0]+delta[0],0,7),clampi(keyboard_cell[1]+delta[1],0,7)]
  board.hover_cell=keyboard_cell
  board.update_highlights()
  on_hover(keyboard_cell)
  return
 if event.keycode==KEY_F:on_cell(keyboard_cell);return
 if event.keycode==KEY_SPACE and game.battle.phase=="playing":
  finish_round();get_viewport().set_input_as_handled()
 elif event.keycode>=KEY_1 and event.keycode<=KEY_5:
  var allies=game.battle.units.filter(func(u):return u.team=="ally")
  var index=event.keycode-KEY_1
  if index<allies.size() and allies[index].hp>0:
   selected=allies[index].id;order="strike" if selected=="ballista" else "move";refresh()
 elif event.keycode==KEY_ESCAPE:
  pending_retreat=false;order="move";refresh()

func _notification(what):
 if what==NOTIFICATION_WM_CLOSE_REQUEST:
  persist()
  get_tree().quit()
