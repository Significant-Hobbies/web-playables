extends Control
## THESIS: equipment becomes commands in a three-front fortress war, not tile walking.
## OWN-WORLD: storm-blue stone, crimson banners, ivory lettering, brass command seals.
## STORY: prepare the company, choose a siege, direct every turn, bring home an unlock.
## FIRST VIEWPORT: full painted keep; company in foreground; campaign order at right.
## FORM: owner-selected B, panoramic battlefield with lower command hand; no random seed.
const Game=preload("res://scripts/siege_game.gd")
const Field=preload("res://scripts/siege_field.gd")
const Chest=preload("res://scripts/iron_chest.gd")
const SAVE="user://iron-and-ember-v2.json"
const IVORY=Color("f0e5cc")
const MUTED=Color("b5c2ce")
const GOLD=Color("d7b575")
const BLUE=Color("90c9ed")
var game=Game.new()
var field
var hud: Control
var page="keep"
var selected="rowan"
var chosen=""
var mission=0
var gear="blade"
var rotation_index=0
var chest
var undo={}
var reduced_motion=false
var muted=false
var sound: AudioStreamPlayer
var title_font=SystemFont.new()
var body_font=SystemFont.new()
var portraits: Texture2D
var unit_art: Texture2D
var command_art: Texture2D
var keyboard_target=""
var demo=false
var help_return="keep"
var retreat_confirm=false

func _ready():
 get_window().min_size=Vector2i(1152,720)
 title_font.font_names=PackedStringArray(["Georgia"])
 body_font.font_names=PackedStringArray(["Avenir Next"])
 body_font.font_weight=400
 var t=Theme.new()
 t.default_font=body_font;t.default_font_size=18
 theme=t
 field=Field.new();field.game=game;field.size=Vector2(1440,900);add_child(field)
 field.actor_clicked.connect(on_actor)
 portraits=load("res://assets/portraits/company.png")
 unit_art=load("res://assets/siege/siege_units_alpha.png")
 command_art=load("res://assets/siege/command_art.png")
 sound=AudioStreamPlayer.new();add_child(sound)
 var args=OS.get_cmdline_user_args()
 demo="--siege-demo" in args or "--keep-demo" in args
 if not demo: game.load_from(SAVE)
 if "--siege-demo" in args: game.begin(0)
 if not game.battle.is_empty(): page="battle"
 mission=mini(game.campaign.unlocked,game.level()-1)
 show_page()

func panel(rect: Rect2,fill=Color("101923"),edge=Color("526273")) -> Panel:
 var p=Panel.new();p.position=rect.position;p.size=rect.size
 p.add_theme_stylebox_override("panel",style(fill,edge));p.mouse_filter=Control.MOUSE_FILTER_IGNORE
 hud.add_child(p);return p

func style(fill: Color,edge: Color,width=1) -> StyleBoxFlat:
 var s=StyleBoxFlat.new();s.bg_color=fill;s.border_color=edge;s.set_border_width_all(width);s.set_corner_radius_all(3)
 s.content_margin_left=12;s.content_margin_right=12;s.content_margin_top=8;s.content_margin_bottom=8
 return s

func label(text: String,x: float,y: float,w: float,h: float,sz=18,color=IVORY,heading=false) -> Label:
 var l=Label.new()
 l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 l.add_theme_font_override("font",title_font if heading else body_font)
 l.add_theme_font_size_override("font_size",sz);l.add_theme_color_override("font_color",color)
 l.mouse_filter=Control.MOUSE_FILTER_IGNORE
 hud.add_child(l)
 l.text=text;l.position=Vector2(x,y);l.size=Vector2(w,h)
 return l

func button(text: String,x: float,y: float,w: float,h: float,callback: Callable,primary=false,disabled=false) -> Button:
 var b=Button.new();b.text=text;b.position=Vector2(x,y);b.size=Vector2(w,h);b.disabled=disabled
 b.add_theme_stylebox_override("normal",style(Color("762e37") if primary else Color("172633"),GOLD if primary else Color("647283")))
 b.add_theme_stylebox_override("hover",style(Color("354657"),GOLD))
 b.add_theme_stylebox_override("pressed",style(Color("435367"),GOLD,2))
 b.add_theme_stylebox_override("focus",style(Color(0,0,0,0),BLUE,2))
 b.add_theme_stylebox_override("disabled",style(Color("1a222c"),Color("445261")))
 b.add_theme_color_override("font_color",IVORY);b.add_theme_color_override("font_hover_color",Color.WHITE)
 b.add_theme_color_override("font_disabled_color",Color("94a0ad"));b.add_theme_font_size_override("font_size",17)
 b.pressed.connect(callback);hud.add_child(b);return b

func art(texture: Texture2D,rect: Rect2,region=Rect2()) -> TextureRect:
 var p=TextureRect.new();p.position=rect.position;p.size=rect.size;p.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;p.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
 if region.size!=Vector2.ZERO:
  var a=AtlasTexture.new();a.atlas=texture;a.region=region;p.texture=a
 else: p.texture=texture
 p.mouse_filter=Control.MOUSE_FILTER_IGNORE;hud.add_child(p);return p

func portrait(id: String,rect: Rect2):
 if id=="merrin": return art(unit_art,rect,Rect2(205,532,190,190))
 var index={"rowan":0,"lysa":1,"merrin":2,"fen":3,"ballista":0}.get(id,5)
 if id=="fen" and game.campaign.pet=="owl": index=4
 return art(portraits,rect,Rect2((index%3)*512,int(index/3)*512,512,512))

func show_page():
 if hud:
  remove_child(hud);hud.queue_free()
 hud=Control.new();hud.size=Vector2(1440,900);hud.mouse_filter=Control.MOUSE_FILTER_IGNORE;add_child(hud)
 field.selected=selected;field.card=chosen;field.reduced_motion=reduced_motion;field.queue_redraw()
 if page!="battle": panel(Rect2(0,0,1440,900),Color(0.03,0.06,0.10,0.68),Color(0,0,0,0))
 match page:
  "keep": keep_page()
  "chest": chest_page()
  "forge": forge_page()
  "help": help_page()
  "battle":
   if game.battle.phase!="playing": reward_page()
   else: battle_page()
 footer()

func header(subtitle: String):
 label("IRON & EMBER",44,25,740,56,38,IVORY,true)
 label(subtitle,46,82,870,34,18,MUTED)
 label("LEVEL %d   ·   %d GOLD" % [game.level(),game.campaign.gold],1070,36,325,34,19,GOLD)
 button("Field guide [?]",1210,81,186,40,func():help_return=page;page="help";show_page())

func footer():
 panel(Rect2(0,858,1440,42),Color("101923"),Color("3e4d5e"))
 var text=game.save_error if game.save_error!="" else game.message
 label(text,24,865,1260,30,15,Color("f0a094") if game.save_error!="" else IVORY)
 label("LOCAL SAVE" if not demo else "TEST SESSION",1300,868,130,24,12,MUTED)

func persist():
 if not demo: game.save_to(SAVE)

func navigate(to: String):
 page=to;chosen="";retreat_confirm=false;show_page()

func keep_page():
 header("The war is outside. The company is yours.")
 label("A company worth\nfighting for.",52,168,650,150,51,IVORY,true)
 label("Recruit. Reforge. Return stronger.",56,327,620,42,23,MUTED)
 var heroes=["rowan","lysa","fen"]
 if game.campaign.mage: heroes.append("merrin")
 for i in range(heroes.size()):
  var index={"rowan":0,"lysa":1,"fen":2,"merrin":3}[heroes[i]]
  var x=25+i*177
  art(unit_art,Rect2(x,375,260,320),Field.REGIONS[index])
  label({"rowan":"Rowan · Captain","lysa":"Lysa · Ranger","fen":"Fen · Companion","merrin":"Merrin · Storm mage"}[heroes[i]],x+20,691,240,30,18,IVORY,true)
 panel(Rect2(853,163,543,543),Color(0.05,0.08,0.12,0.90),Color("826e50"))
 label("CAMPAIGN ORDERS",879,185,490,30,16,GOLD)
 var m=Game.SIEGES[mission]
 label(m.name,879,236,475,92,35,IVORY,true)
 label(m.kind+"  ·  BATTLE %d OF 6" % (mission+1),880,332,470,30,17,BLUE)
 label(m.desc,880,380,464,64,22,IVORY)
 label("Victory: %d gold  ·  %s" % [m.gold,"new company level" if game.campaign.wins[mission]==0 and game.level()<6 else "veteran rewards"],880,461,470,40,18,GOLD)
 for i in range(6):
  var locked=i>game.campaign.unlocked or i>=game.level()
  var caption="—" if locked else ("✓" if game.campaign.wins[i]>0 else str(i+1))
  var b=button(caption,880+i*80,534,64,48,func():mission=i;show_page(),i==mission,locked)
  b.tooltip_text=Game.SIEGES[i].name+(" · win the preceding battle" if locked else "")
 button("March to battle  →",880,622,488,59,start_battle,true)
 button("Open war chest",53,769,242,59,func():navigate("chest"))
 button("Quartermaster & forge",315,769,283,59,func():navigate("forge"))
 if game.level()<6:
  label("NEXT LEVEL",860,741,440,25,14,GOLD)
  label(Game.REWARDS[game.level()+1][0],860,778,540,45,19,IVORY)
 else: label("The company endures. Replay cleared battles for gold and new builds.",860,756,510,64,20,IVORY)

func start_battle():
 if game.begin(mission):
  selected="rowan";chosen="";undo={};page="battle";persist();tone(220)
 show_page()

func battle_page():
 var m=Game.SIEGES[game.battle.mission]
 panel(Rect2(24,20,446,107),Color(0.04,0.07,0.10,0.94),Color("8e7856"))
 label(m.name,43,29,410,40,26,IVORY,true)
 label(m.desc,44,75,408,38,17,MUTED)
 panel(Rect2(535,20,375,78),Color(0.04,0.07,0.10,0.94),Color("536474"))
 label("YOUR ORDERS · ROUND %d" % game.battle.round,555,26,340,32,23,IVORY,true)
 label("Gate %d / 30  ·  %d commands left" % [game.battle.gate,game.battle.commands],555,64,340,27,17,GOLD)
 button("Retreat",1120,27,117,40,func():retreat_confirm=not retreat_confirm;show_page())
 button("Guide [?]",1250,27,165,40,func():help_return=page;page="help";show_page())
 if retreat_confirm:
  panel(Rect2(1042,80,372,106),Color("231923"),GOLD)
  label("Withdraw? Keep gear; forfeit this reward.",1055,85,348,39,16,IVORY)
  button("Confirm retreat",1057,135,168,38,func():game.retreat();persist();show_page(),true)
  button("Stay",1237,135,159,38,func():retreat_confirm=false;show_page())
 var h=game.ally(selected)
 if h.is_empty() or h.hp<=0:
  for member in game.battle.heroes:
   if member.hp>0: selected=member.id;h=member;break
 field.selected=selected;field.card=chosen
 # Portrait roster is deliberately separated from the command hand.
 for i in range(game.battle.heroes.size()):
  var member=game.battle.heroes[i]
  var b=button("",31+i*77,595,66,61,func():select_hero(member.id),member.id==selected,member.hp<=0)
  b.tooltip_text=member.name+" · select hero ["+str(i+1)+"]"
  portrait(member.id,Rect2(34+i*77,598,60,55))
 label(h.name+" · "+Game.FRONTS[h.lane],446,614,410,33,23,IVORY,true)
 label("REPOSITION · 1 COMMAND",938,595,450,24,13,MUTED)
 for lane in range(3):
  var count=0
  for member in game.battle.heroes:
   if member.hp>0 and member.lane==lane: count+=1
  var blocked=h.hp<=0 or h.id=="ballista" or h.shifted or lane==h.lane or game.battle.commands<1 or count>=2
  button(Game.FRONTS[lane],938+lane*156,626,145,36,func():take_snapshot();game.reposition(selected,lane);chosen="";persist();show_page(),false,blocked)
 var list=game.cards(selected)
 var width=1145.0/list.size()
 for i in range(list.size()):
  var id=list[i]
  var info=Game.COMMANDS[id]
  var error=game.reason(selected,id)
  var b=button("",37+i*width,675,width-12,172,func():choose_card(id),chosen==id,error!="")
  b.tooltip_text=error if error!="" else game.card_text(selected,id)
  var image_index={"cleave":0,"strike":0,"ward":1,"guard":1,"volley":2,"bolt":2,"spark":3,"mend":3,"pin":4,"frost":4,"gust":4,"rally":5}[id]
  var painting=art(command_art,Rect2(40+i*width,678,width-18,76),Rect2((image_index%3)*512,int(image_index/3)*512+90,512,270))
  painting.stretch_mode=TextureRect.STRETCH_SCALE
  painting.modulate=Color(1,1,1,0.35 if error!="" else 0.85)
  b.tooltip_text=error if error!="" else game.card_text(selected,id)
  panel(Rect2(44+i*width,683,32,32),Color("101923"),GOLD)
  label(str(info.cost),52+i*width,683,26,30,23,GOLD,true)
  panel(Rect2(41+i*width,731,width-20,29),Color(0.03,0.06,0.09,0.94),Color(0,0,0,0))
  label(info.name,49+i*width,731,width-35,29,18,IVORY,true)
  label(game.card_text(selected,id),49+i*width,765,width-35,77,15,MUTED if error=="" else Color("929ca8"))
 button("Resolve turn\n[Space]",1224,691,190,86,resolve_turn,true)
 button("Undo [Z]",1224,793,190,40,undo_action,false,undo.is_empty())
 var prompt="Choose a card, then its target.  [1–5] hero · [T] cycle targets · [F] confirm" if chosen=="" else Game.COMMANDS[chosen].name+" · click target or [T] then [F] · Esc cancels"
 if keyboard_target!="": prompt+=" · "+keyboard_target.replace("enemy_","Enemy ")
 panel(Rect2(445,130,950,38),Color(0.04,0.07,0.10,0.9),Color("526273"))
 label(prompt,460,134,920,30,17,GOLD)

func select_hero(id: String):
 var h=game.ally(id)
 if h.is_empty() or h.hp<=0: return
 selected=id;chosen="";show_page()

func choose_card(id: String):
 chosen=id
 keyboard_target=""
 if Game.COMMANDS[id].target=="self": on_actor(selected)
 else: game.message=game.card_text(selected,id).replace("\n"," · ");show_page()

func cycle_target():
 if chosen=="": return
 var targets=[]
 for h in game.battle.heroes:
  if game.reason(selected,chosen,h.id)=="": targets.append(h.id)
 for e in game.battle.enemies:
  if game.reason(selected,chosen,e.id)=="": targets.append(e.id)
 if targets.is_empty(): return
 keyboard_target=targets[posmod(targets.find(keyboard_target)+1,targets.size())]
 field.keyboard_target=keyboard_target;show_page()

func on_actor(id: String):
 if page!="battle" or game.battle.phase!="playing": return
 if chosen=="":
  if not game.ally(id).is_empty(): select_hero(id)
  else: game.message=game.foe(id).name+" · "+game.threat(game.foe(id));show_page()
  return
 var prior=game.snapshot()
 if game.play(selected,chosen,id):
  undo=prior;field.animate_action(selected,id);chosen="";keyboard_target="";field.keyboard_target="";tone(420);persist()
 show_page()

func take_snapshot(): undo=game.snapshot()

func resolve_turn():
 if page!="battle" or game.battle.phase!="playing": return
 game.resolve();undo={};chosen="";tone(130);persist();show_page()

func undo_action():
 if undo.is_empty() or game.battle.phase!="playing": return
 game.restore(undo);undo={};chosen="";game.message="Last order undone.";persist();show_page()

func reward_page():
 panel(Rect2(0,0,1440,900),Color(0.025,0.045,0.075,0.75),Color(0,0,0,0))
 var won=game.battle.phase=="victory"
 label("VICTORY" if won else "LIVE TO FIGHT AGAIN",275,135,920,76,49,GOLD,true)
 label(Game.SIEGES[game.battle.mission].name,278,222,850,46,27,IVORY,true)
 portrait("rowan",Rect2(80,335,330,330))
 if won:
  label("+%d gold" % game.battle.reward,485,328,750,64,43,IVORY,true)
  var unlocked=int(game.battle.new_level)
  if unlocked>0:
   label("COMPANY LEVEL %d" % unlocked,488,414,740,35,23,GOLD)
   label("\n".join(Game.REWARDS[unlocked]),488,469,740,151,25,IVORY)
  else: label("Veteran spoils secured. Your company is ready for another build.",488,438,700,100,26,IVORY)
 else:
  label("Your heroes, equipment and earned gold are safe.",480,359,740,100,32,IVORY,true)
  label("Try blocking the threatened front, moving Rowan to protect an ally, or linking your weapon to the storm rune.",480,490,730,133,23,MUTED)
 button("Return to the keep  →",480,709,580,68,func():game.return_to_camp();mission=mini(game.campaign.unlocked,game.level()-1);page="keep";undo={};chosen="";persist();show_page(),true)

func chest_page():
 header("The war chest · what you pack becomes what you can command.")
 button("← Keep",46,145,152,44,func():navigate("keep"))
 label("Build the command hand",49,220,650,55,37,IVORY,true)
 label("Fit gear into the chest. A rune touching a weapon\nadds 2 damage. Leave space for your next unlock.",51,285,661,63,20,MUTED)
 chest=Chest.new();chest.game=game;chest.selected=gear;chest.item_rotation=rotation_index;chest.position=Vector2(80,366);chest.scale=Vector2(1.08,1.08);hud.add_child(chest)
 chest.item_selected.connect(func(id):gear=id;rotation_index=int(game.campaign.placements[id][2]);show_page())
 chest.placement_requested.connect(func(id,x,y,r):game.place(id,x,y,r);persist();show_page())
 label("COMPANY STORES",806,218,525,32,19,GOLD)
 var i=0
 for id in game.campaign.items:
  var packed=game.campaign.placements.has(id)
  button(Game.ITEMS[id].name+("  ·  packed" if packed else "  ·  stored"),807,267+i*53,577,43,func():gear=id;rotation_index=int(game.campaign.placements.get(id,[0,0,0])[2]);show_page(),id==gear)
  i+=1
 button("Rotate [R]",81,799,207,42,rotate_gear)
 button("Store selected gear",307,799,257,42,func():game.stow(gear);persist();show_page())
 label("Selected: "+Game.ITEMS[gear].name,811,731,570,32,23,IVORY,true)
 label("Drag or click to place. WASD moves the chest cursor; F places. R rotates the preview.",811,779,570,56,18,MUTED)

func rotate_gear():
 rotation_index=posmod(rotation_index+1,4)
 if chest: chest.item_rotation=rotation_index;chest.queue_redraw()
 game.message="Rotated preview. Click the destination cell to place the gear."

func transact(action: Callable):
 action.call();persist();show_page()

func forge_page():
 header("The quartermaster · earned gold, lasting improvements.")
 button("← Keep",46,145,150,43,func():navigate("keep"))
 label("Make the next battle yours.",46,218,1050,65,42,IVORY,true)
 label("ARMORY",48,310,540,31,17,GOLD)
 var i=0
 for id in Game.ITEMS:
  var owned=game.campaign.items.has(id)
  var unlocked=game.level()>=game.item_level(id)
  var y=355+i*55
  label(Game.ITEMS[id].name,48,y,257,36,20,IVORY,true)
  if owned:
   var rank=int(game.campaign.items[id])
   var no_forge=id in ["cube","ballista"] or rank>=game.forge_limit()
   button("+%d · Forge %dg" % [rank,30+rank*25] if not no_forge else "+%d · %s" % [rank,"Complete" if rank==3 or id in ["cube","ballista"] else "Next rank locked"],318,y,308,41,func():transact(func():game.upgrade(id)),false,no_forge or game.campaign.gold<30+rank*25)
  else:
   button("Buy · %d gold" % Game.ITEMS[id].price if unlocked else "Unlocks at level %d" % game.item_level(id),318,y,308,41,func():transact(func():game.buy(id)),false,not unlocked or game.campaign.gold<Game.ITEMS[id].price)
  i+=1
 label("THE COMPANY",777,310,540,31,17,GOLD)
 portrait("merrin",Rect2(778,365,140,140))
 label("Merrin · Storm mage",946,363,450,42,28,IVORY,true)
 label("Brings Storm bolt: ranged damage\nand a cancelled enemy attack.",946,414,446,64,19,MUTED)
 button("Recruited" if game.campaign.mage else ("Recruit · 60 gold" if game.level()>=2 else "Unlocks at level 2"),949,491,434,47,func():transact(func():game.recruit()),true,game.campaign.mage or game.level()<2 or game.campaign.gold<60)
 label("PERMANENT TALENT",777,573,545,31,17,GOLD)
 button("Battlecraft · +1 party damage",779,624,604,44,func():transact(func():game.choose_talent("might")),game.campaign.talent=="might",game.level()<2 or game.campaign.talent!="")
 button("Iron resolve · +4 party health",779,681,604,44,func():transact(func():game.choose_talent("resolve")),game.campaign.talent=="resolve",game.level()<2 or game.campaign.talent!="")
 button("Fen · Wolf" if game.campaign.pet=="wolf" else "Switch to Fen",779,770,292,43,func():transact(func():game.choose_pet("wolf")),game.campaign.pet=="wolf")
 button("Talon · Owl" if game.level()>=6 else "Talon · Level 6",1089,770,294,43,func():transact(func():game.choose_pet("owl")),game.campaign.pet=="owl",game.level()<6)

func help_page():
 header("Field guide · no timer, no rush. Every order is yours.")
 button("← Return to game",46,146,240,47,func():navigate(help_return))
 label("Hold the line. Build your company.",49,236,1300,62,40,IVORY,true)
 var sections=[
  ["1 · Prepare","Pack equipment in the war chest to gain command cards. Touch a weapon with the storm rune for +2 damage. Buy and forge gear with earned gold."],
  ["2 · Command","Select a hero or press 1–5. Choose a card, then click a target (or T to cycle, F to confirm). Each card is usable once per round. Share 6 commands; 7 from level 5."],
  ["3 · Read the threat","Each foe shows damage and target. The first living hero on a front takes its attacks. Empty fronts expose the gate. Reposition costs 1 command, once per hero; two allies fit per front."],
  ["4 · Resolve & grow","Space resolves all enemy attacks. Block expires afterward. Defend for the stated rounds or defeat every enemy in an assault. Victory grants gold and level unlocks."]]
 for i in range(4):
  var x=50+(i%2)*704
  var y=343+int(i/2)*176
  label(sections[i][0],x,y,643,38,27,GOLD,true)
  label(sections[i][1],x,y+52,624,112,21,IVORY)
 button("Sound: off" if muted else "Sound: on",50,769,276,48,func():muted=not muted;show_page())
 button("Motion: reduced" if reduced_motion else "Motion: on",350,769,300,48,func():reduced_motion=not reduced_motion;show_page())
 label("Esc: cancel card · Z: undo last order · R: rotate gear\nTab / Shift-Tab: focus controls · Enter: activate",759,771,630,57,17,MUTED)

func tone(frequency: float):
 if muted: return
 var data=PackedByteArray();var rate=22050;var count=2205
 data.resize(count*2)
 for i in range(count):
  var sample=int(sin(TAU*frequency*i/rate)*pow(1.0-float(i)/count,2)*2500)
  data.encode_s16(i*2,sample)
 var wave=AudioStreamWAV.new();wave.format=AudioStreamWAV.FORMAT_16_BITS;wave.mix_rate=rate;wave.data=data;sound.stream=wave;sound.play()

func _unhandled_key_input(event):
 if not event is InputEventKey or not event.pressed or event.echo: return
 if event.keycode==KEY_QUESTION or event.keycode==KEY_SLASH:
  help_return=page;page="help";show_page()
 elif event.keycode==KEY_ESCAPE:
  if page=="help": navigate(help_return)
  else: chosen="";retreat_confirm=false;show_page()
 elif event.keycode==KEY_R and page=="chest": rotate_gear()
 elif page=="battle" and game.battle.phase=="playing":
  if event.keycode==KEY_T: cycle_target()
  elif event.keycode==KEY_F and keyboard_target!="": on_actor(keyboard_target)
  elif event.keycode==KEY_SPACE: resolve_turn()
  elif event.keycode==KEY_Z: undo_action()
  elif event.keycode>=KEY_1 and event.keycode<=KEY_5:
   var index=event.keycode-KEY_1
   if index<game.battle.heroes.size(): select_hero(game.battle.heroes[index].id)
