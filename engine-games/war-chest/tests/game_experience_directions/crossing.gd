extends "res://tests/game_experience_directions/base.gd"
## A: original geometric diorama with contextual unit orders.
func render(state: String):
 context=state
 if state=="battle": battle_labels()
 else: camp_labels()
 queue_redraw()

func _draw():
 paint_rect(Rect2(0,0,1440,900),Color("102a30"))
 for band in range(7):
  poly([Vector2(0,210+band*55),Vector2(260,170+band*45),Vector2(650,280+band*37),Vector2(1040,125+band*55),Vector2(1440,210+band*40),Vector2(1440,900),Vector2(0,900)],Color("294743").lerp(Color("15363c"),float(band)/7))
 if context=="battle": crossing_world()
 else: camp_world()

func crossing_world():
 # River, elevated bridge, defended gate, and one continuous civilian road.
 poly([Vector2(0,633),Vector2(510,489),Vector2(1440,590),Vector2(1440,860),Vector2(0,845)],Color("254b58"))
 for i in range(30):
  var x= float((i*83)%1440);var y=640+float((i*43)%180)
  paint_line(Vector2(x,y),Vector2(x+41,y-6),Color("49717b"),1,true)
 poly([Vector2(203,409),Vector2(1141,588),Vector2(1056,739),Vector2(147,536)],Color("5d685c"))
 poly([Vector2(203,380),Vector2(1141,559),Vector2(1056,710),Vector2(147,508)],Color("a29b7c"))
 for i in range(13):
  var a=Vector2(204,395)+Vector2(69,13)*i
  paint_line(a,a+Vector2(-39,109),Color("777b67"),1,true)
 for p in [Vector2(304,442),Vector2(782,536),Vector2(1032,584)]:
  paint_line(p,p+Vector2(0,194),Color("676e61"),32,true)
  paint_line(p+Vector2(18,0),p+Vector2(18,182),Color("444f4a"),12,true)
 # Road behind the defenders, deliberately separate from the combat front.
 poly([Vector2(21,316),Vector2(778,472),Vector2(846,425),Vector2(56,265)],Color("747f64"))
 for i in range(6):
  var p=Vector2(75+i*113,280+i*22)
  cart(p,0.62)
  civilian(p+Vector2(37,-6),OLIVE,0.7)
  civilian(p+Vector2(26,22),Color("b39374"),0.55)
 # Gate, seen from the side: an open doorway, lanterns, and safe light inside.
 poly([Vector2(946,265),Vector2(1178,309),Vector2(1178,540),Vector2(946,493)],Color("777f6c"))
 poly([Vector2(946,265),Vector2(1045,211),Vector2(1280,254),Vector2(1178,309)],Color("99a28a"))
 poly([Vector2(1178,309),Vector2(1280,254),Vector2(1280,479),Vector2(1178,540)],Color("4c645c"))
 poly([Vector2(1012,363),Vector2(1119,385),Vector2(1119,529),Vector2(1012,509)],Color("152d2d"))
 poly([Vector2(1012,488),Vector2(1119,510),Vector2(1085,577),Vector2(927,544)],Color("bd9558"))
 for p in [Vector2(987,391),Vector2(1136,419)]:
  paint_circle(p,18,Color(GOLD,0.16));paint_rect(Rect2(p-Vector2(4,6),Vector2(8,12)),GOLD)
 for x in range(6):
  paint_rect(Rect2(949+x*39,242+x*7,23,43),Color("99a28a"))
 for p in [Vector2(35,551),Vector2(110,713),Vector2(1310,625),Vector2(1360,503),Vector2(888,239),Vector2(45,257)]: tree(p,1.3)
 paint_arc(Vector2(617,526),63,0,TAU,70,GOLD,3,true)
 arrow(Vector2(365,496),Vector2(549,523),RUST,4)
 arrow(Vector2(437,451),Vector2(558,503),RUST,4)

func battle_labels():
 box(Rect2(24,25,422,103),Color("12272b"),Color("45645f"),1)
 label("THE LANTERN GATE",Rect2(44,40,370,24),14,GOLD,"mono")
 label("Keep the crossing open",Rect2(44,69,385,48),26,PAPER,"serif")
 box(Rect2(896,25,520,103),Color("12272b"),Color("45645f"),1)
 label("12 carts need to get inside",Rect2(918,41,466,29),22,PAPER)
 label("Round 1 / 4  ·  Gate 30 / 30",Rect2(918,82,453,28),17,OLIVE)
 label("FAMILIES → THE OPEN GATE",Rect2(235,218,663,31),16,PAPER,"mono")
 actor("skeleton",Rect2(263,361,137,152));actor("skeleton",Rect2(375,318,132,152))
 actor("rowan",Rect2(556,366,145,164));actor("lysa",Rect2(794,438,144,162));actor("fen",Rect2(955,561,167,114))
 box(Rect2(522,569,188,39),INK)
 label("ROWAN   26 HP",Rect2(537,577,166,26),17,PAPER)
 box(Rect2(231,521,248,61),Color("542d29"),RUST,1)
 label("Next: 6 damage → Rowan",Rect2(247,538,226,29),17,PAPER)
 box(Rect2(474,638,492,195),Color("12272b"),Color("55786b"),1)
 label("Rowan is holding the bridge.",Rect2(496,656,454,36),24,PAPER,"serif")
 label("Raise his shield before the raiders strike.",Rect2(496,700,449,43),18,OLIVE)
 button("Shield  ·  1 order",Rect2(496,761,231,54),true)
 button("Cleave  ·  2 orders",Rect2(742,761,202,54))
 box(Rect2(1025,726,391,107),Color("12272b"),Color("45645f"),1)
 label("YOUR TURN   ● ● ● ● ● ●",Rect2(1045,741,355,29),17,GOLD)
 label("Enemy turn after your orders",Rect2(1045,783,345,30),17,PAPER)
 box(Rect2(24,712,330,121),Color("12272b"))
 label("YOUR COMPANY",Rect2(39,725,283,25),14,OLIVE,"mono")
 actor("rowan",Rect2(40,759,59,61));actor("lysa",Rect2(129,759,59,61));actor("fen",Rect2(222,771,67,41))
 footer("A · THE LAST CROSSING  |  Native presentation proposal · phased civilian motion and two-action tutorial require implementation.")

func camp_world():
 poly([Vector2(0,590),Vector2(483,462),Vector2(1045,494),Vector2(1440,609),Vector2(1440,900),Vector2(0,900)],Color("35483c"))
 for p in [Vector2(39,613),Vector2(145,433),Vector2(1084,429),Vector2(1222,558),Vector2(1332,696)]:tree(p,1.6)
 for i in range(9):
  var p=Vector2(115+i*58,457+(i%3)*42)
  civilian(p,Color("9ca57b"),0.8)
 cart(Vector2(266,556),1.3);cart(Vector2(466,527),1.05)
 paint_circle(Vector2(513,697),76,Color(GOLD,0.08))
 for i in range(6):paint_circle(Vector2(513,697)+Vector2(cos(i*TAU/6),sin(i*TAU/6))*31,12,Color("65736a"))
 poly([Vector2(491,700),Vector2(506,653),Vector2(518,680),Vector2(532,660),Vector2(535,707)],RUST)
 poly([Vector2(504,704),Vector2(513,671),Vector2(525,704)],GOLD)
 camp_chest(Vector2(860,426),61)

func camp_labels():
 label("THE GATE IS OPEN",Rect2(45,40,800,30),18,GOLD,"mono")
 label("Twelve carts. Everyone inside.",Rect2(45,86,1310,75),43,PAPER,"serif")
 label("Company level 2 · +2 starting health for every companion · +85 gold",Rect2(47,173,1300,38),20,OLIVE)
 actor("rowan",Rect2(344,478,178,215));actor("lysa",Rect2(554,496,169,201));actor("fen",Rect2(680,652,147,96))
 box(Rect2(45,243,717,135),Color("12272b"),Color("4e685f"),1)
 label("LYSA",Rect2(63,259,620,24),14,GOLD,"mono")
 label("“The last cart is inside. Ivo isn't.”",Rect2(63,295,665,57),28,PAPER,"serif")
 label("NEXT · BREAK THE ASHEN LINE",Rect2(48,769,663,29),17,OLIVE,"mono")
 label("Find the trail to Lysa's missing brother.",Rect2(48,809,680,31),22,PAPER)
 box(Rect2(827,267,566,117),Color("12272b"),Color("597367"),1)
 label("The raiders carried an army rune.",Rect2(848,285,521,35),24,PAPER,"serif")
 label("Storm rune → touch a weapon for +2 damage.",Rect2(848,334,520,28),18,GOLD)
 glyph("cube",Rect2(1229,475,72,72))
 label("CHEST · 6 × 5",Rect2(862,755,360,27),16,OLIVE,"mono")
 button("Fit the rune →",Rect2(1121,789,271,56),true)
 footer("A · THE LAST CROSSING  |  Camp proposal · real Gate reward and army rune · visible homecoming is new presentation.")
