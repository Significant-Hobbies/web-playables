extends Node2D
## Presentation-only scenery for The Last Crossing. No rules, timers or storage.
## `surface` selects quiet camp / mission scenery; `world_state` can override the
## mission id or use "camp". Actual mission progress always comes from the model.
const Motion=preload("res://scripts/pocket_motion.gd")
const RIVER=Color("102a30")
const FOREST=Color("294743")
const OLIVE=Color("739489")
const PAPER=Color("efe8d6")
const GOLD=Color("e9b85f")
const RUST=Color("c15b49")
const STONE=Color("a9a58d")
const SHADOW=Color("53635d")
const CAMP_SURFACES=["keep","reward","chest","shop","journal","story_banners"]
var state={}
var signature=""
var font=SystemFont.new()

func _ready():
 show_behind_parent=true
 font.font_names=PackedStringArray(["Avenir Next"])
 font.font_weight=600

func sync(game,surface: String,world_state: String,objective_at=Vector2.ZERO,carrier_at=Vector2.ZERO):
 if game==null: hide();return
 var authored=game.battle.has("story") or (game.has_method("story_active") and game.story_active())
 visible=authored
 if not authored: return
 var b: Dictionary=game.battle
 var node="gate"
 if b.has("story"): node=b.story.node
 elif game.has_method("story_node"): node=game.story_node().get("id","gate")
 var camp=surface in CAMP_SURFACES or world_state=="camp"
 if world_state!="" and world_state!="camp": node=world_state
 var q: Dictionary=b.get("quest",{})
 var s: Dictionary=b.get("story",{})
 var decisions: Dictionary=game.campaign.get("story",{}).get("decisions",{})
 var rounds=4
 if node=="winter" and decisions.get("citadel","")!="evacuate": rounds=6
 var crossed=clampf((int(b.get("round",1))-1)/float(rounds),0,1)
 if b.get("phase","")=="victory": crossed=1.0
 state={"node":node,"camp":camp,"surface":surface,"crossed":crossed,
  "progress":int(q.get("progress",0)),"recovery":int(s.get("progress",0)),
  "carrier":s.get("carrier",""),"gate":int(b.get("gate",30)),
  "cart_at":objective_at if objective_at!=Vector2.ZERO else Motion.CROSSING_CART[[0,1,2,0][mini(int(q.get("progress",0)),3)]],
  "carrier_at":carrier_at}
 if carrier_at==Vector2.ZERO:
  for h in b.get("heroes",[]):
   if h.id==state.carrier: state.carrier_at=Motion.point(h,false,b)
 var next=JSON.stringify(state)
 if next!=signature: signature=next;queue_redraw()

func polygon(points: Array,color: Color):
 var vertices=PackedVector2Array()
 for p in points: vertices.append(Vector2(p[0],p[1]))
 draw_colored_polygon(vertices,color)

func _draw():
 if state.is_empty(): return
 var winter=state.node in ["frost","winter","crown","engine"]
 var low=Color("183238") if winter else RIVER
 draw_rect(Rect2(0,0,1440,900),low)
 # Distant river valley and adult, flat planes of forest / mountain.
 polygon([[0,172],[215,93],[411,176],[636,112],[802,175],[998,81],[1250,159],[1440,114],[1440,580],[0,580]],Color("203d42") if winter else FOREST)
 polygon([[0,220],[196,171],[445,249],[731,175],[1001,242],[1260,168],[1440,213],[1440,622],[0,622]],Color("355252") if winter else Color("35564d"))
 polygon([[0,364],[294,316],[521,431],[733,353],[929,467],[1200,353],[1440,411],[1440,720],[0,660]],Color("1b373b"))
 # River glints stop before the quiet lower control band.
 for i in range(10):
  var x=48+(i*149)%1350;var y=457+(i*31)%190
  draw_line(Vector2(x,y),Vector2(x+48+i%3*17,y-7),Color("416568",0.4),2,true)
 if state.camp:
  draw_camp(winter)
 else:
  draw_crossing(winter)
  draw_landmark()
 # Foreground shadows provide depth without obscuring cards or dialogue.
 polygon([[0,630],[145,590],[253,640],[430,598],[623,643],[832,602],[1100,658],[1294,594],[1440,631],[1440,900],[0,900]],Color(low,0.88))
 for p in [Vector2(35,365),Vector2(1327,343),Vector2(1420,440)]: tree(p,1.18,FOREST)
 if winter:
  for p in [Vector2(44,350),Vector2(1360,436),Vector2(191,598)]:
   polygon([[p.x-22,p.y],[p.x+12,p.y-7],[p.x+39,p.y+1],[p.x+10,p.y+6]],Color(PAPER,0.2))

func draw_crossing(winter: bool):
 # The ramp is one place; the three model fronts are positions on it, not a grid.
 polygon([[155,256],[241,235],[1151,403],[1277,530],[1234,574],[261,395]],SHADOW)
 polygon([[169,253],[241,216],[1208,389],[1277,497],[1215,529],[216,344]],STONE)
 polygon([[216,344],[1215,529],[1215,558],[216,376]],Color("758379"))
 polygon([[169,253],[216,344],[216,376],[169,286]],Color("66766e"))
 # A lower warm-stone company path connects to the open gate.
 polygon([[290,353],[1237,508],[1277,545],[1126,626],[270,474],[226,411]],Color("bcb39a"))
 polygon([[270,474],[1126,626],[1117,650],[270,500]],Color("697b70"))
 for i in range(9):
  var p=Vector2(304+i*97,397+i*17)
  draw_line(p,p+Vector2(-28,65),Color("8d9584"),2,true)
  draw_line(p+Vector2(-53,30),p+Vector2(36,46),Color("9b9f8b"),1,true)
 for p in [Vector2(241,229),Vector2(505,276),Vector2(776,324),Vector2(1047,371)]:
  polygon([[p.x-11,p.y],[p.x+9,p.y-7],[p.x+12,p.y+22],[p.x-9,p.y+27]],Color("c7bea4"))
  draw_line(p+Vector2(12,8),p+Vector2(231,48),Color("c7bea4"),5,true)
 # Broad stone arches are visible below, over the river.
 for p in [Vector2(369,475),Vector2(655,526),Vector2(941,577)]:
  polygon([[p.x-45,p.y],[p.x+43,p.y+16],[p.x+39,p.y+70],[p.x+18,p.y+66],[p.x+15,p.y+39],[p.x-15,p.y+29],[p.x-24,p.y+58],[p.x-47,p.y+51]],SHADOW)
 gate(Vector2(1135,360),winter)
 if state.node in ["gate","winter"]: family_road()
 else:
  for p in [Vector2(168,219),Vector2(1262,410)]: lantern(p,0.65)
 if state.node=="ashen":
  for p in [Vector2(239,262),Vector2(703,333)]:
   polygon([[p.x-39,p.y+18],[p.x+34,p.y-23],[p.x+47,p.y-8],[p.x-23,p.y+38]],Color("473e34"))
   draw_line(p+Vector2(-20,22),p+Vector2(29,-7),Color("82624b"),4,true)
   flame(p+Vector2(7,-6),0.6)
 if winter:
  polygon([[224,226],[790,329],[800,335],[236,239]],Color(PAPER,0.38))
  polygon([[294,481],[1035,611],[1026,618],[286,490]],Color(PAPER,0.27))

func gate(at: Vector2,winter: bool):
 # Open arch: river road and lamps remain visible through the defended object.
 var stone=Color("adb5a7") if winter else Color("bcb49b")
 polygon([[at.x-97,at.y-117],[at.x+8,at.y-143],[at.x+125,at.y-104],[at.x+132,at.y+100],[at.x-91,at.y+67]],Color("536a64"))
 polygon([[at.x-97,at.y-117],[at.x+8,at.y-143],[at.x+13,at.y+71],[at.x-91,at.y+67]],stone)
 polygon([[at.x+74,at.y-123],[at.x+125,at.y-104],[at.x+132,at.y+100],[at.x+74,at.y+75]],stone)
 polygon([[at.x+13,at.y-72],[at.x+43,at.y-86],[at.x+75,at.y-72],[at.x+75,at.y+77],[at.x+13,at.y+68]],Color("142d31"))
 polygon([[at.x+13,at.y+24],[at.x+75,at.y+32],[at.x+75,at.y+77],[at.x+13,at.y+68]],Color("928e71"))
 polygon([[at.x-97,at.y-117],[at.x+8,at.y-143],[at.x+125,at.y-104],[at.x+122,at.y-77],[at.x+8,at.y-114],[at.x-93,at.y-88]],Color("d0c7ac"))
 for i in range(4):
  var p=at+Vector2(-81+i*24,-134-i*5)
  polygon([[p.x,p.y],[p.x+16,p.y-4],[p.x+16,p.y+21],[p.x,p.y+24]],stone)
 for i in range(5):
  var p=at+Vector2(-78,-75+i*28)
  draw_line(p,p+Vector2(69,-16),Color("8d9a89"),1.5,true)
 draw_line(at+Vector2(-42,-79),at+Vector2(-42,-13),FOREST,4,true)
 polygon([[at.x-39,at.y-75],[at.x-9,at.y-81],[at.x-9,at.y-38],[at.x-23,at.y-29],[at.x-39,at.y-33]],OLIVE)
 draw_circle(at+Vector2(-24,-53),5,GOLD)
 lantern(at+Vector2(5,-20),0.8);lantern(at+Vector2(85,-7),0.8)
 if state.gate<=0:
  polygon([[at.x-64,at.y-44],[at.x-38,at.y-25],[at.x-50,at.y-2],[at.x-15,at.y+26]],Color("536a64"))

func family_road():
 # A visible household group travels the safe road as enemy phases resolve.
 # There is no independently simulated count or objective.
 var t=float(state.crossed)
 polygon([[1244,450],[1440,502],[1440,536],[1230,482]],Color("827f64"))
 for i in range(3):
  var p=Vector2(1266+i*26,471+i*7).lerp(Vector2(1198+i*7,396+i*12),t)
  civilian(p,0.58,OLIVE if i%2==0 else Color("b49671"))
  if i==1: civilian(p+Vector2(9,7),0.35,Color("c7b78e"))
 cart(Vector2(1361,499).lerp(Vector2(1195,440),t),0.65)

func draw_landmark():
 match state.node:
  "gate","winter": pass
  "ashen":
   polygon([[127,201],[196,181],[200,206],[163,220],[191,232],[149,251]],Color("625648"))
   draw_line(Vector2(166,215),Vector2(212,197),Color("a69c80"),5,true)
  "scout":
   # After the rescue Ivo walks beside Rowan; the High wall marks home.
   var rescued=int(state.progress)>0
   var escorted=rescued and state.carrier_at!=Vector2.ZERO and state.surface=="battle"
   var p=state.carrier_at+Vector2(-66,-6) if escorted else (Vector2(323,228) if rescued else Vector2(1018,306))
   if state.surface=="battle": civilian(p,1.5 if escorted else 0.9,Color("aa9270"))
   if not rescued: prop_label("IVO · RESCUE",p+Vector2(-15,-78),140)
   elif escorted:
    prop_label("IVO",p+Vector2(-18,44),44)
    prop_label("BRING IVO HOME",Vector2(92,262),150)
   lantern((p if not escorted else Vector2(323,228))+Vector2(23,-5),0.55)
  "convoy":
   cart(state.cart_at,1.1)
   prop_label("IVO'S CART",state.cart_at+Vector2(-59,-55 if state.cart_at.x>1200 else 58),140)
  "bell":
   tower(Vector2(179,255),Color("a9a58d"))
   draw_arc(Vector2(186,194),12,PI,TAU,18,GOLD,5,true)
   draw_line(Vector2(174,194),Vector2(198,194),GOLD,3,true)
  "relic":
   polygon([[135,227],[215,206],[216,291],[130,313]],Color("4b716f"))
   for i in range(3): draw_line(Vector2(119,253+i*17),Vector2(227,224+i*17),Color("94b1a2",0.45),2,true)
   tower(Vector2(190,217),Color("879989"),0.75)
   var p=Vector2(990,316) if int(state.recovery)==0 else state.carrier_at+Vector2(37,-16)
   seal(p)
   if int(state.recovery)==0: prop_label("ARCHIVE SEAL",p+Vector2(-64,-78),160)
  "beacons":
   for lane in range(3):
    var p=Motion.CROSSING_ENEMIES[lane]+Vector2(128,-89)
    beacon(p,(int(state.progress)&(1<<lane))!=0)
  "frost":
   standard(Vector2(184,227),Color("829da0"))
   for p in [Vector2(170,267),Vector2(1176,558)]:
    polygon([[p.x-28,p.y+14],[p.x-4,p.y-19],[p.x+18,p.y-28],[p.x+22,p.y+15]],Color("9db3af"))
  "citadel":
   tower(Vector2(172,253),Color("879389"))
   draw_line(Vector2(185,136),Vector2(185,93),RIVER,4,true)
   polygon([[188,96],[227,103],[216,126],[188,122]],RUST)
  "crown":
   tower(Vector2(178,252),Color("758a83"))
   standard(Vector2(224,203),Color("704f45"))
  "engine":
   siege_engine(Vector2(225,229))
   if int(state.recovery)==0:
    chest(Vector2(699,251),0.7)
    prop_label("PAY CHEST",Vector2(644,207),130)
   elif state.carrier_at!=Vector2.ZERO: chest(state.carrier_at+Vector2(-46,30),0.43)

func draw_camp(winter: bool):
 # The company and usable equipment chest are live foreground controls owned by
 # Story / Main. Scenery leaves their staging and chest rectangles clear.
 polygon([[0,332],[255,251],[683,315],[982,240],[1440,346],[1440,667],[0,618]],Color("526455"))
 polygon([[65,400],[267,329],[797,398],[1191,351],[1374,511],[1008,623],[349,566]],Color("89917a"))
 polygon([[86,535],[389,516],[740,583],[1299,464],[1440,505],[1440,586],[700,646],[82,599]],Color("b5ac8f"))
 # A low quartermaster shelter lives behind, not across, the physical chest.
 polygon([[967,216],[1154,181],[1323,242],[1263,283],[1092,256],[967,279]],OLIVE)
 polygon([[967,216],[1092,256],[967,279]],Color("456356"))
 draw_line(Vector2(967,216),Vector2(968,344),Color("8c7a5e"),7,true)
 draw_line(Vector2(1263,283),Vector2(1263,342),Color("8c7a5e"),7,true)
 draw_line(Vector2(1154,181),Vector2(1154,228),Color("8c7a5e"),5,true)
 for p in [Vector2(44,321),Vector2(780,268),Vector2(1393,329)]: tree(p,0.92,FOREST)
 standard(Vector2(184,277),OLIVE)
 # Fire, stacked timber and distant gate link battle and preparation.
 draw_circle(Vector2(813,529),24,Color("d18d49",0.09))
 draw_arc(Vector2(813,534),17,0,TAU,12,SHADOW,7,true)
 flame(Vector2(813,527),0.85)
 for i in range(3): draw_line(Vector2(71,490+i*11),Vector2(125,480+i*11),Color("756952"),8,true)
 lantern(Vector2(1284,310),0.7)
 if winter:
  polygon([[86,535],[389,516],[423,522],[119,547]],Color(PAPER,0.3))

func prop_label(value: String,p: Vector2,width: float):
 draw_style_box(label_style(),Rect2(p-Vector2(5,18),Vector2(width,25)))
 draw_string(font,p,value,HORIZONTAL_ALIGNMENT_LEFT,-1,16,PAPER)

func label_style() -> StyleBoxFlat:
 var style=StyleBoxFlat.new();style.bg_color=Color(RIVER,0.92);style.set_corner_radius_all(3)
 return style

func tower(p: Vector2,color: Color,s=1.0):
 draw_set_transform(p,0,Vector2.ONE*s)
 polygon([[-35,-114],[24,-130],[52,-112],[51,20],[-33,0]],color)
 polygon([[24,-130],[52,-112],[51,20],[24,11]],color.darkened(0.18))
 polygon([[-42,-115],[18,-140],[57,-118],[26,-105]],Color("c0b69c"))
 polygon([[-6,-83],[15,-87],[15,-47],[-6,-44]],RIVER)
 draw_line(Vector2(-27,-15),Vector2(18,-26),color.darkened(0.15),2,true)
 draw_set_transform(Vector2.ZERO)

func standard(p: Vector2,color: Color):
 draw_line(p+Vector2(0,-104),p+Vector2(0,17),Color("bdb294"),5,true)
 polygon([[p.x+2,p.y-100],[p.x+50,p.y-93],[p.x+41,p.y-49],[p.x+20,p.y-41],[p.x+2,p.y-51]],color)
 draw_line(p+Vector2(19,-85),p+Vector2(30,-62),GOLD,4,true)

func siege_engine(p: Vector2):
 for at in [p+Vector2(-23,10),p+Vector2(49,20)]:
  draw_circle(at,20,Color("504f40"));draw_arc(at,15,0,TAU,16,Color("a18f6d"),3,true)
 polygon([[p.x-42,p.y-10],[p.x+57,p.y+5],[p.x+78,p.y-16],[p.x-28,p.y-36]],Color("786d50"))
 draw_line(p+Vector2(-9,-25),p+Vector2(9,-90),Color("b5a278"),12,true)
 draw_line(p+Vector2(9,-90),p+Vector2(86,-102),Color("b5a278"),10,true)
 draw_line(p+Vector2(7,-88),p+Vector2(-23,-37),Color("443f32"),3,true)
 polygon([[p.x+71,p.y-111],[p.x+92,p.y-109],[p.x+97,p.y-91],[p.x+72,p.y-89]],RUST)

func beacon(p: Vector2,lit: bool):
 draw_line(p+Vector2(-12,3),p+Vector2(0,-21),Color("918567"),5,true)
 draw_line(p+Vector2(13,3),p+Vector2(0,-21),Color("918567"),5,true)
 polygon([[p.x-20,p.y-24],[p.x+20,p.y-24],[p.x+13,p.y-10],[p.x-12,p.y-10]],SHADOW)
 if lit: flame(p+Vector2(0,-26),0.75)
 else: draw_line(p+Vector2(-12,-22),p+Vector2(12,-22),Color("746957"),4,true)

func seal(p: Vector2):
 draw_circle(p,13,OLIVE);draw_arc(p,13,0,TAU,20,GOLD,3,true)
 draw_line(p+Vector2(-5,5),p+Vector2(5,-5),PAPER,3,true)

func chest(p: Vector2,s: float):
 draw_set_transform(p,0,Vector2.ONE*s)
 polygon([[-37,-21],[15,-33],[37,-20],[37,23],[-14,34],[-37,21]],Color("9b8053"))
 polygon([[-37,-21],[15,-33],[37,-20],[-14,-8]],GOLD)
 draw_line(Vector2(-25,-22),Vector2(-25,24),Color("d1b578"),6,true)
 draw_line(Vector2(16,-26),Vector2(16,26),Color("d1b578"),6,true)
 draw_rect(Rect2(-3,-4,10,15),RIVER)
 draw_set_transform(Vector2.ZERO)

func cart(p: Vector2,s: float):
 draw_set_transform(p,0,Vector2.ONE*s)
 for at in [Vector2(-26,15),Vector2(27,26)]:
  draw_circle(at,13,SHADOW);draw_arc(at,10,0,TAU,14,Color("b9a37b"),3,true)
 polygon([[-40,-10],[19,-23],[44,-6],[43,18],[-16,32],[-40,12]],Color("927b57"))
 polygon([[-40,-10],[19,-23],[44,-6],[-17,7]],Color("c5b493"))
 polygon([[-20,-13],[9,-19],[13,-6],[-16,0]],Color("a6ad90"))
 draw_line(Vector2(41,8),Vector2(62,18),Color("c5b493"),4,true)
 draw_set_transform(Vector2.ZERO)

func civilian(p: Vector2,s: float,color: Color):
 draw_set_transform(p,0,Vector2.ONE*s)
 draw_line(Vector2(-4,-3),Vector2(-7,14),Color("1c363b"),5,true)
 draw_line(Vector2(4,-3),Vector2(7,14),Color("1c363b"),5,true)
 polygon([[-8,-28],[6,-30],[11,-5],[-11,-3]],color)
 draw_circle(Vector2(0,-37),7,Color("cbb78e"))
 draw_line(Vector2(9,-21),Vector2(16,-6),color,4,true)
 draw_set_transform(Vector2.ZERO)

func lantern(p: Vector2,s: float):
 draw_circle(p,17*s,Color(GOLD,0.08))
 draw_rect(Rect2(p+Vector2(-4,-9)*s,Vector2(8,12)*s),GOLD)
 draw_line(p+Vector2(0,-10)*s,p+Vector2(0,-21)*s,Color("b4ab8e"),2,true)

func flame(p: Vector2,s: float):
 polygon([[p.x-9*s,p.y],[p.x-5*s,p.y-17*s],[p.x+1*s,p.y-28*s],[p.x+6*s,p.y-9*s],[p.x+10*s,p.y-3*s],[p.x+2*s,p.y+5*s]],RUST)
 polygon([[p.x-3*s,p.y],[p.x+1*s,p.y-18*s],[p.x+6*s,p.y-1*s],[p.x+1*s,p.y+5*s]],GOLD)

func tree(p: Vector2,s: float,color: Color):
 draw_line(p,p+Vector2(0,-105)*s,color.darkened(0.18),10*s,true)
 polygon([[p.x-35*s,p.y-30*s],[p.x-19*s,p.y-73*s],[p.x-28*s,p.y-73*s],[p.x,p.y-139*s],[p.x+29*s,p.y-73*s],[p.x+18*s,p.y-73*s],[p.x+38*s,p.y-26*s]],color)
