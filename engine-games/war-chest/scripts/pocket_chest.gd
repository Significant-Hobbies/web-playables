extends "res://scripts/pocket_art.gd"
signal selected_item(id: String)
signal placed(id: String,x: int,y: int,r: int)
const Game=preload("res://scripts/game.gd")
var game
var suggested=[]
var selected="blade"
var item_rotation=0
var cursor=Vector2i(0,0)
var hovering=false
var pressed=Vector2i(-1,-1)
var grabbed=false
var drag_offset=Vector2i.ZERO
var font=SystemFont.new()
const CELL=70

func _ready():
 mouse_filter=Control.MOUSE_FILTER_STOP
 custom_minimum_size=Vector2(420,350)
 font.font_names=PackedStringArray(["Avenir Next"])
 mouse_exited.connect(func():hovering=false;queue_redraw())

func _draw():
 if game==null: return
 for y in range(5):
  for x in range(6): pill(Rect2(x*CELL+3,y*CELL+3,CELL-6,CELL-6),SKY,4)
 for cell in suggested:
  draw_rect(Rect2(cell.x*CELL+5,cell.y*CELL+5,CELL-10,CELL-10),BLUE,false,3)
 for id in game.campaign.placements:
  var p=game.campaign.placements[id]
  var color={"blade":CORAL,"bow":BLUE,"ward":GOLD,"cube":Color("5c8175"),"staff":Color("637c8c"),"flask":Color("697e56"),"ballista":Color("8f7857"),"frost":Color("739596")}.get(id,BLUE)
  for point in game.cells(id,p):
   var rect=Rect2(point[0]*CELL+3,point[1]*CELL+3,CELL-6,CELL-6)
   pill(rect,color.lightened(0.65),10)
   if id==selected: draw_rect(rect.grow(-1),color,false,2)
  draw_set_transform(Vector2(p[0]*CELL+35,p[1]*CELL+34),0,Vector2.ONE*0.52)
  glyph(id,color)
  draw_set_transform(Vector2.ZERO)
  if game.empowered(id): draw_circle(Vector2(p[0]*CELL+56,p[1]*CELL+15),5,BLUE)
 if hovering and selected!="":
  var valid=game.can_place(selected,cursor.x,cursor.y,item_rotation)
  for point in game.cells(selected,[cursor.x,cursor.y,item_rotation]):
   if point[0]>=0 and point[0]<6 and point[1]>=0 and point[1]<5:
    draw_rect(Rect2(point[0]*CELL+3,point[1]*CELL+3,CELL-6,CELL-6),BLUE if valid else CORAL,false,3)

func rotate_preview():
 item_rotation=posmod(item_rotation+1,4);hovering=true;queue_redraw()

func _gui_input(event):
 if event is InputEventMouseMotion:
  var cell=Vector2i(event.position/CELL)
  cursor=cell-drag_offset if grabbed else cell
  hovering=true;queue_redraw()
 if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
  var cell=Vector2i(event.position/CELL)
  if event.pressed:
   pressed=cell;grabbed=false;drag_offset=Vector2i.ZERO
   for id in game.campaign.placements:
    if [cell.x,cell.y] in game.cells(id,game.campaign.placements[id]):
     if id==selected and item_rotation!=int(game.campaign.placements[id][2]): break
     selected=id;item_rotation=int(game.campaign.placements[id][2]);grabbed=true
     var p=game.campaign.placements[id];drag_offset=cell-Vector2i(p[0],p[1])
     break
  else:
   if grabbed and cell==pressed: selected_item.emit(selected)
   elif selected!="": placed.emit(selected,cell.x-drag_offset.x,cell.y-drag_offset.y,item_rotation)
   grabbed=false;drag_offset=Vector2i.ZERO
  accept_event()

func keyboard(key: int):
 match key:
  KEY_W: cursor.y=maxi(0,cursor.y-1)
  KEY_S: cursor.y=mini(4,cursor.y+1)
  KEY_A: cursor.x=maxi(0,cursor.x-1)
  KEY_D: cursor.x=mini(5,cursor.x+1)
  KEY_R: rotate_preview()
  KEY_F: placed.emit(selected,cursor.x,cursor.y,item_rotation)
 hovering=true;queue_redraw()
