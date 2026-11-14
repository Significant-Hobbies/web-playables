extends "res://tests/game_experience_directions/base.gd"
## Direction B: a captain's carved table. Static proposal, no gameplay state.
## Counter positions depict the existing fronts; they never imply free-grid rules.
const WOOD=Color("463d32")
const EDGE=Color("9b7f58")
const MAP=Color("d4c9aa")
const WATER=Color("7eaaa6")
const TRACK=Color("ebe1bf")
const ENEMIES=[Vector2(222,316),Vector2(324,316),Vector2(542,316),Vector2(756,316),Vector2(858,316)]
const COMPANY=[Vector2(274,616),Vector2(542,616),Vector2(810,616)]

func render(scene_context: String):
 context=scene_context
 for child in get_children():child.queue_free()
 if context=="camp":render_camp()
 else:render_battle()
 footer("B · CAPTAIN'S TABLE · Visual direction probe · Three existing fronts; counter positions are cosmetic, with no free-grid movement.")
 queue_redraw()

func render_battle():
 label("LANTERN GATE",Rect2(44,23,770,57),43,PAPER,"serif")
 label("Keep the crossing safe until the families are inside.",Rect2(46,83,950,34),23,Color("cbd5c6"))
 label("6 SHARED ORDERS",Rect2(1100,31,308,31),18,GOLD)
 label("Enemy phase 1 / 4",Rect2(1100,80,308,32),21,PAPER)
 label("THE CAPTAIN'S TABLE",Rect2(84,185,575,28),15,INK,"mono")
 label("FIVE BONE GUARDS · 3 DAMAGE EACH",Rect2(626,185,396,28),14,INK,"mono")
 for front in [["1 · HIGH WALL",274],["2 · CAUSEWAY",542],["3 · LOWER GATE",810]]:
  label(front[0],Rect2(front[1]-106,239,226,28),17,INK,"mono")
 for i in range(ENEMIES.size()):
  var at=ENEMIES[i]
  actor("skeleton",Rect2(at-Vector2(35,55),Vector2(70,90)))
  label("10 HP",Rect2(at.x-27,at.y+43,68,25),16,INK,"mono")
 for i in range(COMPANY.size()):
  var at=COMPANY[i];var id=["rowan","lysa","fen"][i]
  actor(id,Rect2(at-Vector2(44,64),Vector2(88,106)))
  label(["Rowan · 26 HP","Lysa · 20 HP","Fen · 22 HP"][i],Rect2(at.x-99,at.y+58,204,30),18,INK)
 for damage in [[204,423],[310,423],[531,427],[745,423],[851,423]]:
  label("3",Rect2(damage[0],damage[1],40,28),21,RUST,"mono")
 label("GATE · 30 / 30",Rect2(390,757,360,32),21,INK,"mono")
 label("Families crossing",Rect2(811,752,230,28),16,INK)
 box(Rect2(1080,163,320,656),PAPER)
 label("YOUR NEXT ORDER",Rect2(1104,185,268,29),15,INK,"mono")
 label("Rowan",Rect2(1104,228,263,49),35,INK,"serif")
 label("High wall · selected",Rect2(1104,283,264,28),18,INK)
 label("6 incoming",Rect2(1104,330,270,48),36,RUST,"serif")
 label("Two raiders will hit him for 3 each.",Rect2(1104,385,268,60),19,INK)
 button("Shield Rowan · 1 order",Rect2(1098,458,286,58),true)
 label("8 block → 0 HP lost",Rect2(1104,531,270,39),26,INK,"serif")
 label("Both hits are absorbed. Block expires after this enemy phase.",Rect2(1104,578,268,82),19,INK)
 button("Cleave · 2 orders",Rect2(1098,677,286,51))
 label("Hits both raiders for 8 each.",Rect2(1104,739,269,25),16,INK)
 button("Let enemies act →",Rect2(1098,778,286,57))
 label("More orders: Strike · Guard · Move",Rect2(1099,842,291,25),14,PAPER)
 label("Select a company counter, then choose its order.",Rect2(85,818,925,32),20,PAPER)

func render_camp():
 label("THE GATE HELD.",Rect2(44,22,905,60),43,PAPER,"serif")
 label("The families are inside. Ivo is still missing.",Rect2(46,83,900,34),23,Color("cbd5c6"))
 label("COMPANY LEVEL 2",Rect2(1100,30,305,31),18,GOLD)
 label("+85 company gold",Rect2(1100,79,305,31),22,PAPER)
 label("AT THE QUARTERMASTER'S TABLE",Rect2(85,185,835,30),15,INK,"mono")
 label("Prepare a way through the roadblock.",Rect2(85,239,924,51),32,INK,"serif")
 label("YOUR COMPANY",Rect2(91,339,292,29),15,INK,"mono")
 actor("rowan",Rect2(102,400,155,201))
 actor("lysa",Rect2(244,407,147,194))
 actor("fen",Rect2(236,590,162,110))
 label("Rowan · Lysa · Fen",Rect2(93,718,303,31),20,INK)
 label("All three travel with you.",Rect2(93,761,309,57),18,INK)
 label("OPEN WAR CHEST · 6 × 5",Rect2(464,299,522,30),17,INK,"mono")
 glyph("cleave",Rect2(480,384,48,56),PAPER)
 glyph("volley",Rect2(618,384,48,56),PAPER)
 glyph("ward",Rect2(711,365,61,64),INK)
 glyph("cube",Rect2(540,415,50,50),INK)
 label("Rune beside sword",Rect2(464,716,489,33),22,INK,"serif")
 label("Gold cell = placement preview. Touching edges empower the weapon.",Rect2(464,760,499,64),18,INK)
 box(Rect2(1080,163,320,656),PAPER)
 label("RECOVERED FROM THE RAIDERS",Rect2(1103,184,273,43),14,INK,"mono")
 label("Storm rune",Rect2(1103,243,274,54),34,INK,"serif")
 glyph("cube",Rect2(1197,318,75,75),INK)
 label("Fit it beside the sword or bow. Its equipment command gains 2 damage.",Rect2(1104,413,270,100),21,INK)
 label("BUILD PREVIEW",Rect2(1104,549,270,28),15,INK,"mono")
 label("Cleave 8 → 10",Rect2(1103,592,282,46),31,INK,"serif")
 label("Enough to defeat a 10-HP raider.",Rect2(1104,651,270,48),19,INK)
 button("Pack this build",Rect2(1098,725,286,55),true)
 label("NEXT · Break the Ashen Line",Rect2(85,824,824,31),19,PAPER)

func _draw():
 paint_rect(Rect2(0,0,1440,900),WOOD)
 for y in range(132,864,36):
  paint_line(Vector2(0,y),Vector2(1440,y+7),Color("554b3c"),1,true)
 paint_rect(Rect2(0,0,1440,128),INK)
 paint_line(Vector2(0,128),Vector2(1440,128),EDGE,3,true)
 # A chamfered carved board, not three UI column cards.
 poly([Vector2(55,164),Vector2(1026,164),Vector2(1050,188),Vector2(1050,792),Vector2(1026,816),Vector2(55,816),Vector2(31,792),Vector2(31,188)],EDGE)
 poly([Vector2(75,183),Vector2(1014,183),Vector2(1030,199),Vector2(1030,777),Vector2(1014,793),Vector2(75,793),Vector2(59,777),Vector2(59,199)],MAP)
 for at in [Vector2(53,178),Vector2(1028,178),Vector2(53,794),Vector2(1028,794)]:
  paint_circle(at,5,INK);paint_line(at-Vector2(3,0),at+Vector2(3,0),GOLD,1,true)
 if context=="camp":draw_camp()
 else:draw_battle()

func draw_battle():
 # Flat cartographic terrain: three approach tracks span one carved river.
 poly([Vector2(62,414),Vector2(187,381),Vector2(355,418),Vector2(490,391),Vector2(620,418),Vector2(793,385),Vector2(1029,427),Vector2(1029,506),Vector2(792,474),Vector2(623,505),Vector2(488,474),Vector2(357,505),Vector2(184,470),Vector2(62,502)],WATER)
 for x in [274,542,810]:
  paint_line(Vector2(x,287),Vector2(x,726),TRACK,48,true)
  for y in range(409,495,17):
   paint_line(Vector2(x-34,y),Vector2(x+34,y),EDGE,13,true)
   paint_line(Vector2(x-34,y-5),Vector2(x+34,y-5),PAPER,2,true)
 # Woodland and contour marks keep the counters on a terrain board.
 for at in [Vector2(117,345),Vector2(140,615),Vector2(405,562),Vector2(693,359),Vector2(951,559)]:
  paint_circle(at,19,Color(OLIVE,0.50));paint_circle(at+Vector2(18,-11),14,Color(OLIVE,0.42))
 for i in range(ENEMIES.size()):
  var at=ENEMIES[i]
  paint_circle(at+Vector2(0,4),41,Color(INK,0.16))
  paint_circle(at,38,RUST);paint_arc(at,38,0,TAU,48,INK,2,true)
  var destination=COMPANY[0 if i<2 else (1 if i==2 else 2)]
  arrow(at+Vector2(0,69),destination-Vector2(0,83),RUST,3)
 for i in range(COMPANY.size()):
  var at=COMPANY[i]
  paint_circle(at+Vector2(0,4),45,Color(INK,0.19))
  paint_circle(at,41,INK)
  paint_arc(at,48,0,TAU,48,GOLD if i==0 else OLIVE,4 if i==0 else 2,true)
 # Shield preview intercepts Rowan's two next-hit arrows.
 poly([Vector2(259,524),Vector2(291,524),Vector2(290,547),Vector2(275,563),Vector2(259,547)],GOLD)
 paint_line(Vector2(275,529),Vector2(275,551),INK,3,true)
 paint_rect(Rect2(455,725,174,24),INK)
 for x in [445,615]:
  paint_rect(Rect2(x,714,22,42),EDGE)
  for notch in range(3):paint_rect(Rect2(x+notch*8,707,5,10),INK)
 arrow(Vector2(939,696),Vector2(657,737),INK,2)
 cart(Vector2(946,683),0.65)
 for at in [Vector2(858,725),Vector2(883,717),Vector2(906,709)]:civilian(at,INK,0.65)

func draw_camp():
 # An open physical chest on the same wood table; footprints remain authentic.
 paint_rect(Rect2(447,318,446,24),Color("6b5039"))
 paint_rect(Rect2(455,285,430,37),Color("ba9e6e"))
 for x in [471,835]:paint_rect(Rect2(x,314,26,28),INK)
 camp_chest(Vector2(464,346),68)
 paint_rect(Rect2(532,414,65,65),GOLD,false,4)
 arrow(Vector2(923,495),Vector2(606,449),INK,3)
 for at in [Vector2(102,316),Vector2(972,724)]:
  paint_circle(at,19,INK);paint_circle(at-Vector2(3,4),12,Color("ad9370"))
 paint_line(Vector2(884,262),Vector2(947,289),INK,7,true)
 paint_line(Vector2(931,260),Vector2(934,306),INK,4,true)
