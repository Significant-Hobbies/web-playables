extends Control
## Native command symbols plus an opt-in illustrated battle company.
const COMPANY=preload("res://assets/banner-steel/company-atlas.png")
const SPRITES={"rowan":Rect2(0,0,362,397),"lysa":Rect2(362,0,362,397),"fen":Rect2(724,0,362,397),"merrin":Rect2(1086,0,362,397),"owl":Rect2(0,397,362,320),"ballista":Rect2(362,397,372,320),"skeleton":Rect2(734,397,352,320),"armored":Rect2(1086,397,362,320),"archer":Rect2(0,717,362,369),"sapper":Rect2(362,717,362,369),"boss":Rect2(724,717,390,369),"standard":Rect2(1114,717,334,369)}
const PAPER=Color("f4ebd8")
const NAVY=Color("203340")
const BLUE=Color("405947")
const SKY=Color("dfd4bb")
const CORAL=Color("9d4133")
const GOLD=Color("dbac51")
var kind="rowan"
var tint=BLUE
var illustrated=false

func _ready(): mouse_filter=Control.MOUSE_FILTER_IGNORE

func _draw():
 if illustrated and has_sprite(kind):
  sprite(kind,Rect2(Vector2.ZERO,size))
  return
 var scale_factor=minf(size.x,size.y)/100.0
 draw_set_transform(size/2,0,Vector2.ONE*scale_factor)
 glyph(kind,tint)
 draw_set_transform(Vector2.ZERO)

func has_sprite(id: String) -> bool: return SPRITES.has(id)

func sprite(id: String,rect: Rect2,color=Color.WHITE):
 var source: Rect2=SPRITES[id]
 var factor=minf(rect.size.x/source.size.x,rect.size.y/source.size.y)
 var extent=source.size*factor
 draw_texture_rect_region(COMPANY,Rect2(rect.position+Vector2((rect.size.x-extent.x)/2,rect.size.y-extent.y),extent),source,color)

func pill(rect: Rect2,color: Color,radius=9):
 var style=StyleBoxFlat.new();style.bg_color=color;style.set_corner_radius_all(mini(radius,4))
 draw_style_box(style,rect)

func poly(points: Array,color: Color):
 var out=PackedVector2Array()
 for p in points: out.append(Vector2(p[0],p[1]))
 draw_colored_polygon(out,color)

func glyph(id: String,color=BLUE):
 id={"pennant":"move","aegis":"ward","lens":"volley"}.get(id,id)
 match id:
  "rowan","lysa","merrin","skeleton","boss": person(id)
  "fen","wolf": wolf()
  "owl": owl()
  "ballista": ballista()
  "strike","cleave","blade":
   poly([[-20,25],[18,-29],[32,-34],[30,-19],[-9,32]],CORAL)
   draw_line(Vector2(-23,9),Vector2(0,28),NAVY,6,true)
   draw_line(Vector2(-17,22),Vector2(-28,37),NAVY,7,true)
  "guard","ward": shield(Vector2.ZERO,1.1,color)
  "volley","bow","bolt":
   for x in [-20,0,20]:
    draw_line(Vector2(x-15,24),Vector2(x+8,-19),CORAL,5,true)
    poly([[x-3,-20],[x+18,-32],[x+16,-9]],CORAL)
  "move":
   pill(Rect2(-15,-27,26,42),BLUE,5)
   pill(Rect2(-17,4,51,21),BLUE,6)
   draw_line(Vector2(-35,0),Vector2(-22,0),SKY.darkened(0.1),5,true)
  "cube","frost","spark","staff":
   poly([[5,-36],[-25,4],[-3,4],[-12,36],[28,-10],[5,-10]],color)
  "flask","mend":
   pill(Rect2(-23,-13,46,48),BLUE,16);pill(Rect2(-10,-31,20,27),BLUE,3)
   draw_line(Vector2(-12,11),Vector2(12,11),PAPER,7,true);draw_line(Vector2(0,-1),Vector2(0,24),PAPER,7,true)
  "pin","gust": wolf()
  "rally":
   draw_line(Vector2(-23,-36),Vector2(-23,36),NAVY,6,true)
   poly([[-20,-33],[35,-33],[23,-11],[35,6],[-20,6]],CORAL)
  "heart": heart(Vector2.ZERO,1,color)
  "chest":
   pill(Rect2(-38,-23,76,54),GOLD,8)
   draw_rect(Rect2(-38,-2,76,8),NAVY)
   pill(Rect2(-5,-5,10,20),NAVY,3)
  _: draw_circle(Vector2.ZERO,25,color)

func shield(p: Vector2,s: float,color: Color):
 var pts=PackedVector2Array([Vector2(-23,-27),Vector2(23,-27),Vector2(22,1),Vector2(13,20),Vector2(0,29),Vector2(-13,20),Vector2(-22,1)])
 for i in range(pts.size()): pts[i]=pts[i]*s+p
 draw_colored_polygon(pts,color)
 draw_circle(p+Vector2(0,-3)*s,7*s,PAPER)

func heart(p: Vector2,s: float,color: Color):
 draw_circle(p+Vector2(-12,-7)*s,15*s,color);draw_circle(p+Vector2(12,-7)*s,15*s,color)
 var pts=PackedVector2Array([p+Vector2(-25,-1)*s,p+Vector2(25,-1)*s,p+Vector2(0,29)*s])
 draw_colored_polygon(pts,color)

func person(id: String):
 var enemy=id in ["skeleton","boss"]
 var accent=CORAL if id=="rowan" or enemy else (GOLD if id=="lysa" else BLUE)
 # Cape, boots and body are deliberate simple silhouettes, not textured armor.
 poly([[-11,-4],[-39,19],[-20,31],[4,16]],accent)
 pill(Rect2(-17,9,34,28),NAVY,9)
 draw_line(Vector2(-9,30),Vector2(-16,42),NAVY,10,true)
 draw_line(Vector2(10,30),Vector2(17,42),NAVY,10,true)
 pill(Rect2(-27,-37,55,48),NAVY if id!="lysa" else GOLD,19)
 pill(Rect2(-16,-25,36,29),PAPER,10 if enemy else 4)
 if enemy:
  draw_circle(Vector2(-7,-13),6,NAVY);draw_circle(Vector2(10,-13),6,NAVY)
  for x in [-7,0,7]: draw_line(Vector2(x,-1),Vector2(x,7),NAVY,3,true)
  for y in [14,22,30]: draw_line(Vector2(-9,y),Vector2(10,y),PAPER,3,true)
  if id=="boss": poly([[-23,-37],[-25,-52],[-12,-44],[0,-54],[12,-44],[25,-52],[23,-37]],GOLD)
 elif id=="rowan":
  pill(Rect2(-8,-40,38,13),NAVY,4)
  draw_circle(Vector2(-2,-13),3,NAVY);draw_circle(Vector2(12,-13),3,NAVY)
  poly([[-13,-39],[-20,-52],[-37,-50],[-43,-39],[-28,-38],[-22,-29]],CORAL)
 else:
  draw_circle(Vector2(0,-14),3,NAVY);draw_circle(Vector2(12,-14),3,NAVY)
  if id=="merrin": poly([[-27,-33],[1,-65],[27,-33]],BLUE)
 if id=="lysa":
  draw_arc(Vector2(30,4),28,-1.15,1.15,20,NAVY,4,true)
  draw_line(Vector2(41,-21),Vector2(41,29),NAVY,2,true)
  draw_line(Vector2(4,4),Vector2(62,4),NAVY,4,true)
  poly([[58,-3],[72,4],[58,11]],CORAL)
 elif id=="merrin":
  draw_line(Vector2(30,-28),Vector2(30,39),NAVY,5,true)
  draw_circle(Vector2(30,-33),10,GOLD)
 else:
  draw_line(Vector2(25,16),Vector2(45,-17),Color("84b4df"),10,true)
  poly([[40,-20],[51,-30],[50,-14]],Color("84b4df"))
  shield(Vector2(-20,17),0.43,CORAL if enemy else BLUE)

func wolf():
 var fur=Color("6d9ec4")
 pill(Rect2(-34,-9,58,35),fur,15)
 for x in [-24,-7,16]: pill(Rect2(x,16,10,27),fur,4)
 poly([[-26,0],[-48,-5],[-53,10],[-38,23],[-23,12]],fur)
 poly([[4,-18],[4,-45],[20,-31],[33,-38],[40,-16]],fur)
 pill(Rect2(4,-28,42,38),fur,12)
 pill(Rect2(23,-5,34,19),SKY,9)
 draw_circle(Vector2(33,-15),4,NAVY);draw_circle(Vector2(53,-1),5,NAVY)
 poly([[7,7],[26,18],[7,27]],CORAL)

func owl():
 poly([[-15,0],[-53,-31],[-45,9],[-21,22]],Color("84b4df"))
 poly([[15,0],[53,-31],[45,9],[21,22]],Color("84b4df"))
 pill(Rect2(-22,-26,44,66),NAVY,22)
 draw_circle(Vector2(-10,-4),13,PAPER);draw_circle(Vector2(10,-4),13,PAPER)
 draw_circle(Vector2(-9,-4),5,NAVY);draw_circle(Vector2(9,-4),5,NAVY)
 poly([[-5,9],[5,9],[0,17]],GOLD)

func ballista():
 draw_circle(Vector2(-23,29),14,NAVY);draw_circle(Vector2(23,29),14,NAVY)
 pill(Rect2(-38,4,75,18),Color("88b7d8"),5)
 draw_line(Vector2(-26,4),Vector2(15,-27),NAVY,7,true)
 draw_line(Vector2(-26,-19),Vector2(40,-19),NAVY,9,true)
 draw_line(Vector2(-10,-39),Vector2(15,6),BLUE,7,true)
 poly([[36,-27],[53,-19],[36,-11]],CORAL)

func landscape(battle_view=true):
 draw_rect(Rect2(0,0,1440,900),PAPER)
 draw_circle(Vector2(1090,141),29,GOLD)
 cloud(Vector2(420,141),0.7);cloud(Vector2(1190,183),0.9)
 poly([[0,253],[177,173],[367,273],[620,195],[870,299],[1130,220],[1440,286],[1440,900],[0,900]],SKY)
 poly([[0,382],[191,333],[429,423],[700,284],[991,404],[1210,314],[1440,383],[1440,900],[0,900]],Color("c5e2f6"))
 if battle_view:
  for y in [300,455,610]: bridge(y)
  castle(Vector2(-28,135),false);castle(Vector2(1306,135),true)
 else:
  draw_rect(Rect2(0,623,1440,277),Color("d2e8f5"))
  castle(Vector2(49,426),false)
  poly([[0,745],[325,633],[567,695],[898,649],[1440,755],[1440,900],[0,900]],PAPER)
 for p in [Vector2(45,652),Vector2(1388,646),Vector2(1271,679)]:
  draw_rect(Rect2(p+Vector2(-3,20),Vector2(6,28)),NAVY)
  var pts=PackedVector2Array([p+Vector2(0,-38),p+Vector2(-20,27),p+Vector2(20,27)])
  draw_colored_polygon(pts,NAVY)

func cloud(p: Vector2,s: float):
 draw_circle(p,22*s,SKY);draw_circle(p+Vector2(25,-13)*s,30*s,SKY);draw_circle(p+Vector2(56,0)*s,22*s,SKY)
 draw_rect(Rect2(p+Vector2(-22,0)*s,Vector2(100,22)*s),SKY)

func bridge(y: float):
 draw_rect(Rect2(153,y,1154,17),Color("8fbce2"))
 draw_rect(Rect2(153,y,1154,6),Color("b4d7f0"))
 for x in [190,556,934,1250]:
  poly([[x,y+17],[x+38,y+17],[x+27,y+63],[x+9,y+63]],Color("8fbce2"))

func castle(p: Vector2,enemy: bool):
 draw_rect(Rect2(p,Vector2(161,197)),NAVY)
 for x in [0,64,128]: draw_rect(Rect2(p+Vector2(x,-24),Vector2(33,45)),NAVY)
 pill(Rect2(p+Vector2(61,135),Vector2(41,71)),PAPER,21)
 poly([[p.x+44,p.y+34],[p.x+113,p.y+34],[p.x+113,p.y+111],[p.x+79,p.y+94],[p.x+44,p.y+111]],CORAL if enemy else BLUE)
 if enemy:
  draw_circle(p+Vector2(80,60),15,PAPER)
  draw_circle(p+Vector2(74,58),4,NAVY);draw_circle(p+Vector2(86,58),4,NAVY)
 else:
  poly([[p.x+61,p.y+56],[p.x+70,p.y+68],[p.x+79,p.y+53],[p.x+88,p.y+68],[p.x+98,p.y+56],[p.x+92,p.y+79],[p.x+66,p.y+79]],PAPER)
