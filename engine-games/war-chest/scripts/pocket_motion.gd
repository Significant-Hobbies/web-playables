extends RefCounted
## Presentation-only timeline. Owns copied positions/results, never game state.
const LENGTH=0.68
const CROSSING_ENEMIES=[Vector2(340,300),Vector2(675,335),Vector2(1010,370)]
const CROSSING_COMPANY=[Vector2(440,460),Vector2(775,500),Vector2(1110,540)]
const CROSSING_CART=[Vector2(194,467),Vector2(535,514),Vector2(1299,440)]
var age=0.0
var tracks={}
var effects=[]
var lunges={}
var summary=""

static func point(unit: Dictionary,enemy: bool,state: Dictionary) -> Vector2:
 var slot=0
 var count=0
 for other in state.get("enemies" if enemy else "heroes",[]):
  if other.hp>0 and other.lane==unit.lane: count+=1
 for other in state.get("enemies" if enemy else "heroes",[]):
  if other.id==unit.id: break
  if other.hp>0 and other.lane==unit.lane: slot+=1
 if state.has("story"):
  var center: Vector2=(CROSSING_ENEMIES if enemy else CROSSING_COMPANY)[int(unit.lane)]
  return center+Vector2(1,0.12)*(slot-(count-1)/2.0)*108
 var center=[350.0,720.0,1090.0][int(unit.lane)]
 var x=center+(slot-(count-1)/2.0)*116
 return Vector2(x,310 if enemy else 531)

## The same physical objective is used by world props, threats and impacts.
static func gate_point(state: Dictionary) -> Vector2:
 if not state.has("story"): return Vector2(720,174)
 if state.story.get("node","")=="convoy":
  var stage=mini(int(state.get("quest",{}).get("progress",0)),3)
  return CROSSING_CART[[0,1,2,0][stage]]
 return Vector2(1135,360)

func clear():
 tracks.clear();effects.clear();lunges.clear();age=0.0;summary=""

func active() -> bool: return not tracks.is_empty() or not effects.is_empty() or not lunges.is_empty()

func advance(delta: float):
 if not active(): return
 age+=maxf(0,delta)
 if age>=LENGTH: clear()

func add(kind: String,at: Vector2,label="",color=Color("405947"),extra={}):
 var fx={"kind":kind,"at":at,"label":label,"color":color}
 fx.merge(extra);effects.append(fx)

func build(before: Dictionary,after: Dictionary,actor="",card="",resolved=false):
 var visible={}
 for id in tracks: visible[id]=position(id,tracks[id].to)
 clear()
 if before.is_empty() or after.is_empty(): return
 var old={};var fresh={}
 var impact_time=0.39 if resolved else (0.24 if card in ["volley","bolt","spark","frost","gust"] else 0.0)
 var outcomes=[]
 for enemy in [false,true]:
  var key="enemies" if enemy else "heroes"
  for u in before.get(key,[]):
   if u.hp>0: old[u.id]={"unit":u.duplicate(true),"point":visible.get(u.id,point(u,enemy,before)),"enemy":enemy}
  for u in after.get(key,[]):
   fresh[u.id]={"unit":u,"point":point(u,enemy,after),"enemy":enemy}
   if u.hp<=0: continue
   if old.has(u.id):
    var compression=old[u.id].unit.lane==u.lane and point(old[u.id].unit,enemy,before)!=fresh[u.id].point and card!="move"
    tracks[u.id]={"from":old[u.id].point,"to":fresh[u.id].point,"delay":impact_time+0.18 if compression else 0.0}
   else: add("arrival",fresh[u.id].point)
 if before.get("story",{}).get("node","")=="convoy" and gate_point(before)!=gate_point(after):
  tracks["_objective"]={"from":visible.get("_objective",gate_point(before)),"to":gate_point(after),"delay":impact_time+0.18}
 var struck=[]
 for id in old:
  if not fresh.has(id): continue
  var was=old[id];var now=fresh[id].unit;var at=was.point
  var damage=int(was.unit.hp)-int(now.hp)
  if damage>0:
   add("damage",at,"−%d" % damage,Color("c3423f"),{"id":id,"delay":impact_time,"duration":0.18 if now.hp<=0 else LENGTH-impact_time})
   outcomes.append("%s −%d HP" % [was.unit.name,damage])
   if was.enemy: struck.append(at)
  elif damage<0:
   add("heal",at,"+%d HP" % -damage,Color("236c58"))
   outcomes.append("%s +%d HP" % [was.unit.name,-damage])
  var shield=int(now.get("shield",0))-int(was.unit.get("shield",0))
  if shield>0:
   add("shield",at,"+%d block" % shield)
   outcomes.append("%s +%d block" % [was.unit.name,shield])
  if now.get("stunned",false) and not was.unit.get("stunned",false) and now.hp>0:
   add("stun",at,"Stunned",Color("203340"),{"delay":impact_time})
   outcomes.append(was.unit.name+" stunned")
  if now.hp<=0: add("vanish",at,"",Color.WHITE,{"unit":was.unit,"enemy":was.enemy,"delay":impact_time,"duration":0.18})
 if old.has(actor) and card not in ["guard","ward","mend","rally","move"]:
  var start=old[actor].point
  for at in struck:
   var kind="slash" if card in ["strike","cleave","pin"] else ("arrow" if card in ["volley","bolt"] else "spell")
   add(kind,at,"",Color("dbac51") if card=="spark" else Color("405947"),{"from":start})
  if not struck.is_empty(): lunges[actor]=(struck[0]-start).normalized()*18
 if card=="gust":
  for fx in effects:
   if fx.kind=="stun": add("spell",fx.at,"",Color("739596"),{"from":old[actor].point});break
 if resolved:
  var i=0
  var remaining={};var absorbed=before.get("motion_absorbed",{}).duplicate()
  for h in before.heroes: remaining[h.id]=before.get("motion_attack_state",{}).get(h.id,{"hp":h.hp,"shield":h.shield}).duplicate()
  for e in before.enemies if before.get("motion_enemy_turn",true) else []:
   if e.hp<=0: continue
   var start=point(e,true,before)
   if e.stunned: add("skip",start,"Skipped",Color("203340"));continue
   var destination=gate_point(before) if e.target=="gate" else old.get(e.target,{}).get("point",start)
   if e.target!="gate" and not old.has(e.target): continue
   if remaining.has(e.target):
    var h=remaining[e.target]
    if h.hp<=0: continue
    var power=int(e.get("motion_power",e.power))
    var blocked=mini(h.shield,power)
    h.shield-=blocked;h.hp=maxi(0,h.hp-power+blocked)
    absorbed[e.target]=int(absorbed.get(e.target,0))+blocked
   add("enemy",destination,"",Color("9d4133"),{"from":start,"delay":minf(i*0.025,0.15)})
   lunges[e.id]=(destination-start).normalized()*12;i+=1
  if after.gate<before.gate:
   var defense="Cart" if before.get("story",{}).get("node","")=="convoy" else "Gate"
   add("damage",gate_point(before),"%s −%d" % [defense,before.gate-after.gate],Color("c3423f"),{"delay":impact_time})
   outcomes.append("%s −%d" % [defense,before.gate-after.gate])
  for id in absorbed:
   if absorbed[id]>0:
    add("shield",old[id].point,"Blocked %d" % absorbed[id],Color("405947"),{"delay":impact_time})
    outcomes.append("%s blocked %d" % [old[id].unit.name,absorbed[id]])
 summary=" · ".join(outcomes)

func position(id: String,rest: Vector2) -> Vector2:
 if not tracks.has(id): return rest
 var delay=float(tracks[id].get("delay",0))
 var t=clampf((age-delay)/minf(0.24,LENGTH-delay),0,1);t=1-pow(1-t,3)
 return tracks[id].from.lerp(tracks[id].to,t)

func offset(id: String) -> Vector2:
 return lunges.get(id,Vector2.ZERO)*sin(PI*clampf(age/0.28,0,1))

func impact(id: String) -> float:
 for fx in effects:
  if fx.kind=="damage" and fx.get("id","")==id:
   return sin(PI*clampf((age-fx.get("delay",0))/0.24,0,1))
 return 0.0

func last_impact() -> float:
 var last=0.0
 for fx in effects:
  if fx.kind in ["arrow","spell","enemy"]: last=maxf(last,float(fx.get("delay",0))+0.24)
 return last
