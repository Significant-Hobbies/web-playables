extends Control
## Isolated visual proposals. No model, save, settings, or network access.
const Art = preload("res://scripts/pocket_art.gd")
const INK = Color("15282b")
const PAPER = Color("efe8d6")
const GOLD = Color("e9b85f")
const RUST = Color("c15b49")
const OLIVE = Color("739489")
var sans = SystemFont.new()
var serif = SystemFont.new()
var mono = SystemFont.new()
var context = "battle"
var recording = false
var primitives = []
var controls = []

func rect_data(rect: Rect2): return [rect.position.x,rect.position.y,rect.size.x,rect.size.y]
func color_data(color: Color): return [color.r,color.g,color.b,color.a]
func point_data(point: Vector2): return [point.x,point.y]
func paint_rect(rect: Rect2, color: Color, filled = true, width = -1.0, antialiased = false):
 if recording: primitives.append({"kind":"rect","rect":rect_data(rect),"color":color_data(color),"filled":filled,"width":width})
 else: draw_rect(rect,color,filled,width,antialiased)
func paint_line(from: Vector2,to: Vector2,color:Color,width=1.0,antialiased=false):
 if recording:primitives.append({"kind":"line","from":point_data(from),"to":point_data(to),"color":color_data(color),"width":width})
 else:draw_line(from,to,color,width,antialiased)
func paint_circle(at:Vector2,radius:float,color:Color,filled=true,width=-1.0,antialiased=false):
 if recording:primitives.append({"kind":"circle","at":point_data(at),"radius":radius,"color":color_data(color),"filled":filled,"width":width})
 else:draw_circle(at,radius,color,filled,width,antialiased)
func paint_colored_polygon(points:PackedVector2Array,color:Color):
 if recording:
  var output=[]
  for p in points:output.append(point_data(p))
  primitives.append({"kind":"polygon","points":output,"color":color_data(color)})
 else:draw_colored_polygon(points,color)
func paint_arc(at:Vector2,radius:float,start:float,end:float,count:int,color:Color,width=1.0,antialiased=false):
 if recording:primitives.append({"kind":"arc","at":point_data(at),"radius":radius,"start":start,"end":end,"color":color_data(color),"width":width})
 else:draw_arc(at,radius,start,end,count,color,width,antialiased)

func _ready():
 sans.font_names = PackedStringArray(["Avenir Next", "Arial"])
 sans.font_weight = 500
 serif.font_names = PackedStringArray(["Georgia"])
 serif.font_weight = 700
 mono.font_names = PackedStringArray(["Menlo"])

func box(rect: Rect2, fill: Color, edge = Color.TRANSPARENT, border = 0):
 if recording: controls.append({"kind":"box","rect":rect_data(rect),"color":color_data(fill),"edge":color_data(edge),"width":border})
 var panel = Panel.new()
 panel.position = rect.position; panel.size = rect.size
 panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
 var style = StyleBoxFlat.new()
 style.bg_color = fill; style.border_color = edge; style.set_border_width_all(border)
 panel.add_theme_stylebox_override("panel", style)
 add_child(panel)
 return panel

func label(value: String, rect: Rect2, point = 20, color = INK, family = "sans"):
 if recording: controls.append({"kind":"text","text":value,"rect":rect_data(rect),"point":point,"color":color_data(color),"family":family})
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

func actor(id: String, rect: Rect2):
 if recording: controls.append({"kind":"actor","id":id,"rect":rect_data(rect)})
 var sprite = Art.new()
 sprite.kind = id; sprite.illustrated = true
 sprite.position = rect.position; sprite.size = rect.size
 add_child(sprite)
 return sprite

func glyph(id: String, rect: Rect2, tint = GOLD):
 if recording: controls.append({"kind":"glyph","id":id,"rect":rect_data(rect),"color":color_data(tint)})
 var sprite = Art.new()
 sprite.kind = id; sprite.tint = tint
 sprite.position = rect.position; sprite.size = rect.size
 add_child(sprite)
 return sprite

func button(value: String, rect: Rect2, primary = false):
 box(rect, GOLD if primary else Color("253a3e"), GOLD if primary else Color("5b7471"), 1)
 return label(value, Rect2(rect.position + Vector2(18, 12), rect.size - Vector2(30, 18)), 20, INK if primary else PAPER)

func footer(text: String):
 box(Rect2(0, 868, 1440, 32), INK)
 label(text, Rect2(24, 875, 1390, 22), 13, Color("abc1b7"))

func poly(points: Array, color: Color):
 paint_colored_polygon(PackedVector2Array(points), color)

func arrow(from: Vector2, to: Vector2, color: Color, width = 3.0):
 paint_line(from, to, color, width, true)
 var vector = (to - from).normalized()
 var normal = Vector2(-vector.y, vector.x)
 paint_colored_polygon(PackedVector2Array([to, to - vector * 15 + normal * 7, to - vector * 15 - normal * 7]), color)

func civilian(at: Vector2, color: Color, scale_value = 1.0):
 paint_circle(at + Vector2(0, -24) * scale_value, 5 * scale_value, Color("dcc4a1"))
 paint_colored_polygon(PackedVector2Array([at + Vector2(-8,-18)*scale_value, at + Vector2(7,-18)*scale_value, at+Vector2(10,-2)*scale_value, at+Vector2(-10,-2)*scale_value]),color)
 paint_line(at+Vector2(-4,-3)*scale_value, at+Vector2(-5,5)*scale_value, INK, 3 * scale_value, true)
 paint_line(at+Vector2(4,-3)*scale_value, at+Vector2(5,5)*scale_value, INK, 3 * scale_value, true)

func cart(at: Vector2, scale_value = 1.0):
 paint_rect(Rect2(at+Vector2(-24,-24)*scale_value, Vector2(45,22)*scale_value), Color("795442"))
 paint_rect(Rect2(at+Vector2(-20,-42)*scale_value, Vector2(37,19)*scale_value), Color("baa17c"))
 paint_line(at+Vector2(-19,-26)*scale_value,at+Vector2(17,-26)*scale_value, Color("e0c297"), 2 * scale_value, true)
 for x in [-15,14]:
  paint_circle(at+Vector2(x,1)*scale_value, 9*scale_value, INK)
  paint_circle(at+Vector2(x,1)*scale_value, 5*scale_value, Color("ba9671"))
 paint_line(at+Vector2(19,-15)*scale_value,at+Vector2(37,-9)*scale_value,Color("795442"),3*scale_value,true)

func tree(at: Vector2, scale_value = 1.0, tone = Color("254b47")):
 paint_line(at, at+Vector2(0,-48)*scale_value,Color("5c6651"),7*scale_value,true)
 for y in [-38,-58,-79]:
  poly([at+Vector2(-24,y+28)*scale_value,at+Vector2(0,y-15)*scale_value,at+Vector2(24,y+28)*scale_value],tone)

func camp_chest(at: Vector2, cell = 44.0):
 paint_rect(Rect2(at-Vector2(16,16), Vector2(cell*6+32,cell*5+32)),Color("624b39"))
 paint_rect(Rect2(at-Vector2(8,8), Vector2(cell*6+16,cell*5+16)),Color("b69b6e"))
 for y in range(5):
  for x in range(6):
   paint_rect(Rect2(at+Vector2(x,y)*cell, Vector2(cell-3,cell-3)),Color("3a4138"))
 var gear=[[[0,0],[0,1],[0,2],[1,2]],[[2,0],[2,1],[2,2]],[[3,0],[4,0],[3,1],[4,1]],[[1,1]]]
 var colors=[Color("ad6753"),Color("728b65"),Color("aaa58c"),GOLD]
 for i in range(gear.size()):
  for p in gear[i]:
   paint_rect(Rect2(at+Vector2(p[0],p[1])*cell,Vector2(cell-3,cell-3)),colors[i])
