extends Control
signal placement_requested(id: String,x: int,y: int,item_rotation: int)
signal item_selected(id: String)
const Game=preload("res://scripts/game.gd")
var game
var selected="blade"
var item_rotation=0
var hover=Vector2i(-1,-1)
var dragging=false
var origin=Vector2(28,25)
var cell_size=68.0
var font=ThemeDB.fallback_font
var press_cell=Vector2i(-1,-1)

func _ready():
 custom_minimum_size=Vector2(470,405)
 mouse_filter=Control.MOUSE_FILTER_STOP
 mouse_exited.connect(func(): hover=Vector2i(-1,-1);queue_redraw())

func _draw():
 if game==null: return
 draw_style_box(frame(Color("142320"),Color("8b7957")),Rect2(origin-Vector2(12,12),Vector2(6*cell_size+24,5*cell_size+24)))
 for y in range(5):
  for x in range(6):
   var rect=Rect2(origin+Vector2(x,y)*cell_size+Vector2(2,2),Vector2.ONE*(cell_size-4))
   draw_rect(rect,Color("25362e"))
   draw_rect(rect,Color("445045"),false,1)
 for id in game.campaign.placements:
  var p=game.campaign.placements[id]
  var color=Color(Game.ITEMS[id].color)
  for point in game.cells(id,p):
   var rect=Rect2(origin+Vector2(point[0],point[1])*cell_size+Vector2(3,3),Vector2.ONE*(cell_size-6))
   draw_style_box(frame(color.darkened(0.64),color if selected==id else color.darkened(0.2)),rect)
  var anchor=origin+Vector2(p[0],p[1])*cell_size+Vector2(cell_size/2,cell_size/2)
  icon(id,anchor,color)
  var initials={"blade":"BLADE","bow":"BOW","ward":"SHIELD","cube":"RUNE","staff":"STAFF","flask":"MEND","ballista":"SIEGE","frost":"FROST"}[id]
  draw_string(font,anchor+Vector2(-25,27),initials,HORIZONTAL_ALIGNMENT_CENTER,50,10,Color("f3ead4"))
  if game.empowered(id): draw_circle(anchor+Vector2(23,-24),4,Color("9bdace"))
 if selected!="" and hover.x>=0 and hover.y>=0:
  var legal=game.can_place(selected,hover.x,hover.y,item_rotation)
  var color=Color("9bddbe") if legal else Color("ef9c84")
  for p in game.cells(selected,[hover.x,hover.y,item_rotation]):
   if p[0]<6 and p[1]<5:
    draw_rect(Rect2(origin+Vector2(p[0],p[1])*cell_size+Vector2(1,1),Vector2.ONE*(cell_size-2)),color,false,3)
 draw_string(font,Vector2(28,392),"6 × 5  •  ROTATE WITH R  •  TEAL DOT = RUNE-LINKED",HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color("b9c2b3"))

func frame(fill: Color,edge: Color) -> StyleBoxFlat:
 var s=StyleBoxFlat.new()
 s.bg_color=fill
 s.border_color=edge
 s.set_border_width_all(1)
 s.set_corner_radius_all(3)
 return s

func icon(id: String,c: Vector2,color: Color):
 match id:
  "blade","staff":
   draw_line(c+Vector2(0,13),c+Vector2(0,-21),color,5,true)
   draw_line(c+Vector2(-12,4),c+Vector2(12,4),color,3,true)
   if id=="staff": draw_circle(c+Vector2(0,-20),7,color)
  "bow":
   draw_arc(c+Vector2(-13,0),22,-1.1,1.1,16,color,4,true)
   draw_line(c+Vector2(-3,-20),c+Vector2(-3,20),color,1,true)
   draw_line(c+Vector2(-15,0),c+Vector2(21,0),color,2,true)
  "ward":
   draw_colored_polygon(PackedVector2Array([c+Vector2(-16,-19),c+Vector2(16,-19),c+Vector2(14,5),c+Vector2(0,19),c+Vector2(-14,5)]),color)
   draw_line(c+Vector2(0,-16),c+Vector2(0,12),color.darkened(0.5),3)
  "cube","frost":
   draw_colored_polygon(PackedVector2Array([c+Vector2(0,-21),c+Vector2(19,-9),c+Vector2(19,10),c+Vector2(0,20),c+Vector2(-19,10),c+Vector2(-19,-9)]),color.darkened(0.2))
   draw_line(c+Vector2(-17,-8),c,color,2)
   draw_line(c,c+Vector2(17,-8),color,2)
   draw_line(c,c+Vector2(0,18),color,2)
  "flask":
   draw_circle(c+Vector2(0,4),14,color)
   draw_rect(Rect2(c+Vector2(-6,-18),Vector2(12,18)),color)
  "ballista":
   draw_line(c+Vector2(-23,-9),c+Vector2(23,-9),color,5)
   draw_line(c+Vector2(0,-22),c+Vector2(0,18),color,4)
   draw_line(c+Vector2(-17,12),c+Vector2(17,12),color,3)

func _gui_input(event):
 if game==null: return
 if event is InputEventMouseMotion:
  hover=Vector2i(floor((event.position.x-origin.x)/cell_size),floor((event.position.y-origin.y)/cell_size))
  if hover.x>5 or hover.y>4: hover=Vector2i(-1,-1)
  queue_redraw()
 if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
  var p=Vector2i(floor((event.position.x-origin.x)/cell_size),floor((event.position.y-origin.y)/cell_size))
  if p.x<0 or p.y<0 or p.x>5 or p.y>4: return
  if event.pressed:
   press_cell=p
   dragging=false
   for id in game.campaign.placements:
    if [p.x,p.y] in game.cells(id,game.campaign.placements[id]):
     selected=id
     item_rotation=int(game.campaign.placements[id][2])
     dragging=true
     queue_redraw()
     break
  else:
   if dragging and p==press_cell:
    item_selected.emit(selected)
   elif selected!="":
    placement_requested.emit(selected,p.x,p.y,item_rotation)
   dragging=false
  accept_event()
