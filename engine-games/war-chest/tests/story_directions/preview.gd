extends Control
## Owner-selection probes only. No game model, saves, settings or network.
const Art = preload("res://scripts/pocket_art.gd")
const WORLD = preload("res://assets/banner-steel/lantern-gate.png")
const Story = preload("res://scripts/story_data.gd")
const PAPER = Color("f4ebd8")
const INK = Color("203340")
const OLIVE = Color("405947")
const STONE = Color("dfd4bb")
const RUST = Color("9d4133")
const GOLD = Color("dbac51")
const MUTED = Color("596050")
var direction = 0
var context = "dialogue"
var sans = SystemFont.new()
var serif = SystemFont.new()
var mono = SystemFont.new()
var feedback = ""

func _ready():
 sans.font_names = PackedStringArray(["Avenir Next", "Arial"])
 sans.font_weight = 500
 serif.font_names = PackedStringArray(["Georgia", "Times New Roman"])
 serif.font_weight = 700
 mono.font_names = PackedStringArray(["Menlo", "Courier New"])
 rebuild()

func box(rect: Rect2, fill: Color, edge = Color.TRANSPARENT, border = 0):
 var panel = Panel.new()
 panel.position = rect.position; panel.size = rect.size
 panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
 var style = StyleBoxFlat.new()
 style.bg_color = fill; style.border_color = edge; style.set_border_width_all(border)
 panel.add_theme_stylebox_override("panel", style)
 add_child(panel)
 return panel

func label(value: String, rect: Rect2, point = 20, color = INK, family = "sans"):
 var node = Label.new()
 node.position = rect.position; node.size = rect.size
 node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
 node.mouse_filter = Control.MOUSE_FILTER_IGNORE
 node.add_theme_font_override("font", {"sans":sans, "serif":serif, "mono":mono}[family])
 node.add_theme_font_size_override("font_size", point)
 node.add_theme_color_override("font_color", color)
 node.text = value
 add_child(node)
 return node

func actor(id: String, rect: Rect2, alpha = 1.0):
 var portrait = Art.new()
 portrait.kind = id; portrait.illustrated = true
 portrait.position = rect.position; portrait.size = rect.size
 portrait.modulate.a = alpha
 add_child(portrait)

func portrait(id: String, rect: Rect2):
 # Crops the existing atlas live. This is no new/downloaded raster asset.
 var crops={"rowan":Rect2(165,43,116,139),"lysa":Rect2(476,57,109,127),"merrin":Rect2(1190,39,151,181)}
 box(rect.grow(8),PAPER,STONE,2)
 var texture=AtlasTexture.new();texture.atlas=Art.COMPANY;texture.region=crops[id]
 var node=TextureRect.new();node.texture=texture;node.position=rect.position;node.size=rect.size
 node.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;node.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
 node.mouse_filter=Control.MOUSE_FILTER_IGNORE;add_child(node)

func glyph(id: String, rect: Rect2, tint = OLIVE):
 var node = Art.new()
 node.kind = id; node.tint = tint; node.position = rect.position; node.size = rect.size
 add_child(node)

func button(value: String, rect: Rect2, action: Callable, primary = false):
 var node = Button.new()
 node.position = rect.position; node.size = rect.size; node.text = value
 node.add_theme_font_override("font", sans)
 node.add_theme_font_size_override("font_size", 19)
 for state in ["normal", "hover", "pressed", "focus"]:
  var style = StyleBoxFlat.new()
  style.bg_color = (INK if primary else PAPER) if state=="normal" else (OLIVE if primary else STONE)
  style.border_color = GOLD if state=="focus" else MUTED
  style.set_border_width_all(3 if state=="focus" else 2)
  node.add_theme_stylebox_override(state, style)
 node.add_theme_color_override("font_color", PAPER if primary else INK)
 node.add_theme_color_override("font_hover_color", PAPER if primary else INK)
 node.add_theme_color_override("font_pressed_color", PAPER if primary else INK)
 node.pressed.connect(action)
 add_child(node)
 return node

func choice(value: String, consequence: String, rect: Rect2, primary = false):
 button(value, rect, func(): feedback="Preview choice: "+value; rebuild(), primary)
 label(consequence, Rect2(rect.position+Vector2(15,rect.size.y+7),Vector2(rect.size.x-30,40)),17, MUTED)

func convoy_choice(index: int, rect: Rect2):
 var option=Story.NODES[2].choices[index]
 # Neither branch is the recommended answer before the player decides.
 choice(option.label,option.consequence,rect)

func scene_header(title: String, subtitle: String, color = INK):
 label(title, Rect2(44,25,960,33),19,color,"mono" if direction==1 else "sans")
 label(subtitle,Rect2(44,62,960,28),17,color)
 var contexts=[["Dialogue","Company road"],["Ivo's account","Campaign ledger"],["Talk to Ivo","Camp"]]
 button(contexts[direction][0 if context=="journey" else 1],Rect2(1120,30,275,46),func():context="dialogue" if context=="journey" else "journey";feedback="";rebuild())

func prototype_note():
 box(Rect2(0,869,1440,31),PAPER)
 label(feedback if feedback!="" else "DIRECTION PREVIEW  ·  authored story / illustrative presentation  ·  no progress saved",Rect2(44,875,1320,22),14,MUTED)

func rebuild():
 var focused=get_viewport().gui_get_focus_owner()
 var focus_text=focused.text if focused is Button and focused.get_parent()==self else ""
 for child in get_children(): remove_child(child);child.queue_free()
 queue_redraw()
 match direction:
  0:
   if context=="dialogue": cinematic_dialogue()
   else: cinematic_journey()
  1:
   if context=="dialogue": orders_dialogue()
   else: orders_journey()
  2:
   if context=="dialogue": camp_dialogue()
   else: camp_journey()
 prototype_note()
 if focus_text!="":
  var first:Button=null
  for child in get_children():
   if child is Button:
    if first==null:first=child
    if child.text==focus_text:child.grab_focus();return
  if first!=null:first.grab_focus()

func _draw():
 draw_texture_rect(WORLD,Rect2(0,0,1440,900),false)
 draw_rect(Rect2(0,0,1440,900),Color(PAPER,0.15 if direction==0 and context=="dialogue" else 0.94))
 if direction==0 and context=="journey":
  draw_line(Vector2(160,325),Vector2(1240,325),OLIVE,5,true)
  for point in [Vector2(210,325),Vector2(720,325),Vector2(1230,325)]:
   draw_circle(point,12,OLIVE)
   draw_circle(point,5,PAPER)
 if direction==1:
  var origin=Vector2(838,255) if context=="dialogue" else Vector2(108,252)
  var extent=Vector2(505,283) if context=="dialogue" else Vector2(750,365)
  # A single campaign route: twelve nodes, without intersections that imply branches.
  var points=[Vector2(0.08,0.85),Vector2(0.27,0.7),Vector2(0.18,0.44),Vector2(0.41,0.25),Vector2(0.55,0.53),Vector2(0.7,0.34),Vector2(0.84,0.14),Vector2(0.95,0.30),Vector2(0.96,0.61),Vector2(0.88,0.85),Vector2(0.68,0.91),Vector2(0.50,0.78)]
  for i in range(1,points.size()): draw_line(origin+points[i-1]*extent,origin+points[i]*extent,Color(OLIVE,0.55),3,true)
  for i in range(points.size()):
   var p=origin+points[i]*extent
   draw_circle(p,10,GOLD if i==3 else (OLIVE if i<3 else PAPER))
   draw_arc(p,10,0,TAU,24,INK,2,true)
 if direction==2:
  draw_rect(Rect2(0,555,1440,317),Color(STONE,0.6))

func cinematic_dialogue():
 box(Rect2(0,0,1440,111),PAPER)
 scene_header("A · COMPANY & CONSEQUENCES", "Chapter I · The Gate We Opened · after rescuing Ivo")
 box(Rect2(44,135,604,76),Color(PAPER,0.94))
 label("One cart left",Rect2(65,143,575,64),45,INK,"serif")
 actor("rowan",Rect2(64,242,328,358))
 actor("lysa",Rect2(1081,243,302,357))
 actor("fen",Rect2(952,506,190,92))
 box(Rect2(429,237,646,266),Color(PAPER,0.97))
 box(Rect2(429,237,5,266),RUST)
 label("IVO  ·  LYSA'S BROTHER",Rect2(455,257,590,31),18,RUST)
 label("“"+Story.NODES[2].outro[-1].text+"”",Rect2(455,306,590,181),26,INK,"serif")
 box(Rect2(20,610,1400,247),PAPER)
 label("YOUR ORDER FOR IVO'S CART",Rect2(48,632,1100,27),18,OLIVE)
 label("Use the recovered steel where it will keep the cart moving.",Rect2(48,669,1340,42),25,INK,"serif")
 convoy_choice(0,Rect2(47,730,659,70))
 convoy_choice(1,Rect2(726,730,659,70))

func cinematic_journey():
 scene_header("A · COMPANY & CONSEQUENCES", "Chapter I · Three encounters survived · twelve across the winter campaign")
 label("A road worth following.",Rect2(45,115,1130,77),51,INK,"serif")
 label("A stolen war chest. A missing brother. Orders the company will have to answer for.",Rect2(48,204,1250,43),23,MUTED)
 for data in [["I","THE GATE WE OPENED",95],["II","NAMES IN THE LEDGER",606],["III","WHAT WE KEEP",1095]]:
  var x=int(data[2])
  label(data[0],Rect2(x,264,248,38),26,OLIVE,"serif")
  label(data[1],Rect2(x,354,285,28),18,INK)
  label("Bring Ivo's supply cart home." if x==95 else ("Find the names behind the wages." if x==606 else "Recover the chest. Keep our promise."),Rect2(x,397,290,50),19,MUTED)
 box(Rect2(44,485,746,337),PAPER,STONE,1)
 label("NEXT · 04 / 12",Rect2(70,507,680,28),18,OLIVE)
 label("The Last Supply Cart",Rect2(70,553,674,60),36,INK,"serif")
 label("Ivo is safe. His last cart carries flour, lamp oil and medicine. Keep Rowan beside it through all four escort stages.",Rect2(70,630,670,83),23,INK)
 button("Prepare the chest",Rect2(70,749,281,49),func():feedback="Preview: spatial preparation remains the real war-chest system.";rebuild())
 button("Decide the escort →",Rect2(376,749,383,49),func():context="dialogue";rebuild(),true)
 actor("rowan",Rect2(848,493,190,247));actor("lysa",Rect2(1014,511,182,230));actor("fen",Rect2(1171,619,185,134))
 label("THE COMPANY",Rect2(872,453,481,29),18,OLIVE)
 label("Rowan · Lysa · Fen\nMerrin awaits in Names in the Ledger.",Rect2(875,772,480,61),21,INK)

func orders_dialogue():
 scene_header("B · ORDERS & LETTERS", "Chapter I · after the rescue · a command is also a promise")
 label("Order 004",Rect2(47,119,600,70),54,INK,"serif")
 label("THE LAST SUPPLY CART",Rect2(50,198,700,37),22,RUST,"mono")
 box(Rect2(46,254,710,375),PAPER,STONE,1)
 label("Ivo's account  ·  after the rescue",Rect2(71,278,651,39),21,OLIVE)
 label("“"+Story.NODES[2].outro[-1].text+"”",Rect2(72,343,651,165),26,INK,"serif")
 label("The company now knows",Rect2(72,530,630,28),18,RUST,"mono")
 label("The missing chest holds the households' winter wages.",Rect2(72,571,630,52),21,INK)
 label("THE FRONT",Rect2(838,188,525,30),18,OLIVE,"mono")
 label("The Last Supply Cart",Rect2(840,574,500,43),31,INK,"serif")
 label("Four escort stages · flour, lamp oil and medicine\nRowan stays with the wheels. Lysa watches the far bank.",Rect2(839,626,523,71),19,INK)
 convoy_choice(0,Rect2(47,715,706,69))
 convoy_choice(1,Rect2(781,715,611,69))

func orders_journey():
 scene_header("B · ORDERS & LETTERS", "Winter campaign · twelve encounters · every order carries a name")
 label("The winter ledger",Rect2(47,116,1170,78),51,INK,"serif")
 label("I · THE GATE WE OPENED",Rect2(66,217,750,31),20,OLIVE,"mono")
 label("The Gate",Rect2(57,581,293,41),30,INK,"serif")
 label("The Ashen Line",Rect2(248,467,310,36),22,INK,"serif")
 label("The Missing Scout",Rect2(91,358,356,39),24,INK,"serif")
 label("The Last Supply Cart",Rect2(438,307,430,39),24,INK,"serif")
 label("II · NAMES IN THE LEDGER",Rect2(502,217,390,31),17,MUTED,"mono")
 label("III · WHAT WE KEEP",Rect2(506,638,350,31),18,MUTED,"mono")
 actor("standard",Rect2(43,686,71,91))
 label("Ivo is home",Rect2(144,719,244,30),20,OLIVE)
 label("One cart of supplies. A promise to bring it through.",Rect2(144,757,730,59),23,INK,"serif")
 box(Rect2(942,145,456,703),PAPER,INK,2)
 label("ORDER 004 / 012",Rect2(968,177,400,35),18,RUST,"mono")
 label("The Last\nSupply Cart",Rect2(968,239,396,119),38,INK,"serif")
 label("Mission",Rect2(970,401,383,30),18,OLIVE,"mono")
 label("Keep Rowan with the cart through all four escort stages. A missed stage costs its cargo.",Rect2(970,445,391,132),23,INK)
 label("Preparation",Rect2(970,588,383,29),18,OLIVE,"mono")
 label("Reinforce: 30 gate health.\nDecoy: 25 health, one enemy drawn from the first escort front.",Rect2(970,632,389,89),20,INK)
 button("Set the loadout",Rect2(967,731,405,47),func():feedback="Preview: open the real chest before departure.";rebuild())
 button("Sign the order →",Rect2(967,791,405,47),func():context="dialogue";rebuild(),true)

func camp_dialogue():
 scene_header("C · AT THE FIRE", "Chapter I · Ivo is safe · the company gathers before the convoy")
 label("Everyone came back.",Rect2(48,117,1267,68),46,INK,"serif")
 portrait("rowan",Rect2(851,278,218,220));portrait("lysa",Rect2(1140,278,218,220))
 label("ROWAN",Rect2(851,518,247,29),18,OLIVE)
 label("Old orders",Rect2(851,556,247,27),18,MUTED)
 label("LYSA",Rect2(1140,518,218,29),18,RUST)
 label("A missing brother",Rect2(1140,556,236,27),18,MUTED)
 box(Rect2(45,219,719,315),PAPER)
 label("IVO  ·  RESCUED SCOUT",Rect2(70,238,646,29),18,RUST)
 label("“"+Story.NODES[2].outro[-1].text+"”",Rect2(70,287,665,163),27,INK,"serif")
 label("Lysa has her brother back. The valley still needs its winter wages.",Rect2(70,463,665,60),20,MUTED)
 label("THE NEXT PROMISE",Rect2(48,595,800,28),18,OLIVE)
 label("Get Ivo's cart through. Decide what the recovered steel should protect.",Rect2(48,637,1316,51),26,INK,"serif")
 convoy_choice(0,Rect2(46,716,656,71))
 convoy_choice(1,Rect2(724,716,669,71))

func camp_journey():
 scene_header("C · AT THE FIRE", "Chapter I · three encounters survived · the company gathers")
 label("What we owe each other.",Rect2(47,117,1215,72),49,INK,"serif")
 label("The company is more than what fits in the chest.",Rect2(49,204,1074,37),25,MUTED)
 label("04",Rect2(53,293,90,51),33,RUST,"serif")
 label("The Last Supply Cart",Rect2(158,290,691,49),34,INK,"serif")
 label("Lysa has her brother back. His cart carries flour, lamp oil and medicine. Hear him before the company heads out.",Rect2(159,358,618,118),24,INK)
 button("Hear Ivo's account →",Rect2(158,488,519,54),func():context="dialogue";rebuild(),true)
 box(Rect2(48,572,690,3),STONE)
 label("The Gate opened. The Ashen Line broke.",Rect2(52,606,678,38),25,MUTED,"serif")
 label("Ivo brought home. The winter wages still missing.",Rect2(52,667,697,60),20,MUTED)
 portrait("rowan",Rect2(844,328,225,231));portrait("lysa",Rect2(1134,328,225,231))
 label("II · Names in the Ledger\nMerrin awaits on the winter road.\nIII · What We Keep — bring the chest home.",Rect2(848,613,511,105),20,INK)
 glyph("chest",Rect2(844,748,74,68),GOLD)
 button("Open the chest",Rect2(951,753,413,53),func():feedback="Preview: pack the company loadout before departure.";rebuild())
 label("Twelve encounters. Three chapters. People who remember your orders.",Rect2(49,798,789,48),20,INK)
