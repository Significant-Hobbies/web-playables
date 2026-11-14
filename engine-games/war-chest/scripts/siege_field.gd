extends Control
## Separate rendered actors: the backdrop contains no game state.
signal actor_clicked(id: String)
const Game=preload("res://scripts/siege_game.gd")
var game
var selected="rowan"
var card=""
var keyboard_target=""
var hit_boxes={}
var font=SystemFont.new()
var atlas: Texture2D
var backdrop: Texture2D
var effects=[]
var reduced_motion=false
const FEET=[314.0,430.0,560.0]
const REGIONS=[Rect2(0,0,512,480),Rect2(512,0,512,480),Rect2(1024,0,512,480),Rect2(0,480,512,544),Rect2(512,480,512,544),Rect2(1024,480,512,544)]

func _ready():
 font.font_names=PackedStringArray(["Avenir Next"])
 mouse_filter=Control.MOUSE_FILTER_STOP
 backdrop=load("res://assets/siege/siege_backdrop.png")
 atlas=load("res://assets/siege/siege_units_alpha.png")

func actor_rect(unit: Dictionary, enemy: bool) -> Rect2:
 var others=game.battle.enemies if enemy else game.battle.heroes
 var slot=0
 for u in others:
  if u.id==unit.id: break
  if u.hp>0 and u.lane==unit.lane: slot+=1
 var x=840.0+slot*175 if enemy else 410.0+slot*170
 return Rect2(x-57,FEET[unit.lane]-110,114,114)

func _draw():
 if backdrop: draw_texture_rect(backdrop,Rect2(Vector2.ZERO,Vector2(1440,900)),false)
 if game==null or game.battle.is_empty(): return
 hit_boxes.clear()
 for lane in range(3):
  var y=FEET[lane]
  draw_line(Vector2(250,y+7),Vector2(1270,y+7),Color(0.7,0.8,0.9,0.25),1)
  draw_style_box(box(Color("101923"),Color("526273")),Rect2(36,y-42,168,36))
  draw_string(font,Vector2(48,y-18),Game.FRONTS[lane],HORIZONTAL_ALIGNMENT_LEFT,-1,17,Color("f0e5cc"))
 for h in game.battle.heroes:
  if h.hp>0: draw_actor(h,false)
 for e in game.battle.enemies:
  if e.hp>0: draw_actor(e,true)
 for effect in effects:
  var a=effect.time/0.5
  draw_line(effect.from,effect.to,Color(1.0,0.8,0.45,a),3,true)
  draw_circle(effect.to,10+(1-a)*22,Color(1,0.6,0.3,a*0.5),false,3,true)

func draw_actor(u: Dictionary,enemy: bool):
 var rect=actor_rect(u,enemy)
 var color=Color("e9867c") if enemy else Color("90c9ed")
 var center=Vector2(rect.get_center().x,FEET[u.lane])
 ground_ring(center,Vector2(42,8),Color(0,0,0,0.5))
 if u.id==selected and not enemy: ground_ring(center,Vector2(45,9),Color("d7b575"),false)
 var index=5 if enemy and u.boss else (4 if enemy else {"rowan":0,"lysa":1,"fen":2,"merrin":3,"ballista":0}.get(u.id,0))
 if atlas: draw_texture_rect_region(atlas,rect,REGIONS[index])
 hit_boxes[u.id]=rect.grow(6)
 if u.id==keyboard_target: draw_rect(rect.grow(5),Color("d7b575"),false,3)
 if u.id=="ballista":
  draw_line(center+Vector2(-42,-30),center+Vector2(42,-30),Color("d7b575"),7,true)
  draw_line(center+Vector2(0,-50),center+Vector2(0,-8),Color("d7b575"),5,true)
 var bar=Rect2(center+Vector2(-51,5),Vector2(102,6))
 draw_rect(bar,Color("101923"))
 draw_rect(Rect2(bar.position,Vector2(102*float(u.hp)/u.max_hp,6)),color)
 var label=u.name+"  %d/%d" % [u.hp,u.max_hp]
 if not enemy and u.shield>0: label+="  +%d block" % u.shield
 var w=maxf(144,font.get_string_size(label,HORIZONTAL_ALIGNMENT_LEFT,-1,15).x+12)
 draw_style_box(box(Color("101923"),Color("405163")),Rect2(center+Vector2(-w/2,-20),Vector2(w,23)))
 draw_string(font,center+Vector2(-w/2+6,-3),label,HORIZONTAL_ALIGNMENT_LEFT,-1,15,Color("f0e5cc"))
 if enemy:
  var intent=game.threat(u)
  var width=font.get_string_size(intent,HORIZONTAL_ALIGNMENT_LEFT,-1,15).x+16
  var pos=Vector2(rect.end.x+13,rect.position.y+36)
  draw_style_box(box(Color("231b22"),color.darkened(0.4)),Rect2(pos,Vector2(width,25)))
  draw_string(font,pos+Vector2(8,18),intent,HORIZONTAL_ALIGNMENT_LEFT,-1,15,color)
  if card!="" and game.reason(selected,card,u.id)=="": draw_circle(rect.get_center()+Vector2(0,14),42,Color(1,0.8,0.5,0.65),false,2,true)

func ground_ring(center: Vector2,radius: Vector2,color: Color,filled=true):
 var points=PackedVector2Array()
 for i in range(33): points.append(center+Vector2(cos(i*TAU/32)*radius.x,sin(i*TAU/32)*radius.y))
 if filled: draw_colored_polygon(points,color)
 else: draw_polyline(points,color,2,true)

func box(fill: Color,edge: Color) -> StyleBoxFlat:
 var s=StyleBoxFlat.new()
 s.bg_color=fill;s.border_color=edge;s.set_border_width_all(1);s.set_corner_radius_all(3)
 return s

func animate_action(actor: String,target: String):
 if reduced_motion: return
 var a=game.ally(actor)
 var b=game.foe(target)
 if b.is_empty(): b=game.ally(target)
 if a.is_empty() or b.is_empty(): return
 effects.append({"from":actor_rect(a,false).get_center(),"to":actor_rect(b,target.begins_with("enemy_")).get_center(),"time":0.5})

func _process(delta):
 if effects.is_empty(): return
 for e in effects: e.time-=delta
 effects=effects.filter(func(e):return e.time>0)
 queue_redraw()

func _gui_input(event):
 if event is InputEventMouseButton and event.pressed and event.button_index==MOUSE_BUTTON_LEFT:
  for id in hit_boxes:
   if hit_boxes[id].has_point(event.position):
    actor_clicked.emit(id)
    accept_event()
    return
