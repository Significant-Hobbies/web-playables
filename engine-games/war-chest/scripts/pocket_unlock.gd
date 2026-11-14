extends Control
## One bounded level seal: a closing gold ring and four outward sparks.
const DURATION=0.65
var age=0.0
var level=2
var reduced_motion=false
var font=SystemFont.new()

func _ready():
 mouse_filter=Control.MOUSE_FILTER_IGNORE
 font.font_names=PackedStringArray(["Georgia","Times New Roman"])
 if reduced_motion: age=DURATION
 queue_redraw()

func _process(delta):
 if age>=DURATION: return
 age=minf(DURATION,age+delta);queue_redraw()

func _draw():
 var t=clampf(age/DURATION,0,1)
 var center=size/2
 var radius=25.0 if reduced_motion else lerpf(20,25,1-pow(1-t,3))
 draw_circle(center,radius,Color("dbac51"))
 draw_arc(center,31,-PI/2,-PI/2+TAU*(1 if reduced_motion else minf(1,t*2)),48,Color("405947"),3,true)
 draw_string(font,center+Vector2(-8,9),str(level),HORIZONTAL_ALIGNMENT_LEFT,-1,25,Color("203340"))
 if not reduced_motion and t<1:
  for i in range(4):
   var direction=Vector2.from_angle(PI/4+i*PI/2)
   draw_line(center+direction*(34+t*9),center+direction*(39+t*12),Color(Color("405947"),1-t),2,true)
