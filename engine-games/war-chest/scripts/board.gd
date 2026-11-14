extends Node3D
## THESIS: a crafted miniature bridge, not a flat abstract combat grid.
## OWN-WORLD: mossy sandstone, walnut, pennants, teal water, brass unit bases.
## STORY: read threats, select a miniature, commit an order.
## FIRST VIEWPORT: orthographic battlefield dominates, annotations above pieces.
## FORM: Painted War Table, owner-delegated direction A from prior concept round.

signal cell_clicked(cell: Array)
signal cell_hovered(cell: Array)
const Game=preload("res://scripts/game.gd")
var camera: Camera3D
var pieces={}
var tiles={}
var highlights: Node3D
var hover_cell=[]
var game
var active="rowan"
var order="move"
var time=0.0
var animated=[]
var materials={}
var rng=RandomNumberGenerator.new()
var camp=false
var biome=-1
var water_material: ShaderMaterial
var active_tweens={}
var floating=[]
var selection_ring: MeshInstance3D

func _ready():
 rng.seed=8251
 camera=Camera3D.new()
 add_child(camera)
 camera.projection=Camera3D.PROJECTION_ORTHOGONAL
 camera.size=13.9
 camera.position=Vector3(8,12,14)
 camera.position+=Vector3(1,0,1.3)
 camera.look_at(Vector3(1,0,1.3))
 camera.current=true
 var environment=WorldEnvironment.new()
 var env=Environment.new()
 env.background_mode=Environment.BG_COLOR
 env.background_color=Color("172b2d")
 env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
 env.ambient_light_color=Color("abc8bc")
 env.ambient_light_energy=0.32
 env.tonemap_mode=Environment.TONE_MAPPER_FILMIC
 environment.environment=env
 add_child(environment)
 var sun=DirectionalLight3D.new()
 sun.rotation_degrees=Vector3(-50,-35,0)
 sun.light_color=Color("ffe2b5")
 sun.light_energy=0.85
 sun.shadow_enabled=true
 sun.directional_shadow_max_distance=35
 add_child(sun)
 var fill=DirectionalLight3D.new()
 fill.rotation_degrees=Vector3(-25,140,0)
 fill.light_color=Color("729ea9")
 fill.light_energy=0.22
 add_child(fill)
 terrain()
 highlights=Node3D.new()
 add_child(highlights)

func orbit(angle: float):
 camera.position=camera.position.rotated(Vector3.UP,angle)
 camera.look_at(Vector3.ZERO)

func mat(color: Color, metallic=0.0) -> StandardMaterial3D:
 var key=str(color)+str(metallic)
 if materials.has(key): return materials[key]
 var m=StandardMaterial3D.new()
 m.albedo_color=color
 m.roughness=0.86
 m.metallic=metallic
 if ResourceLoader.exists("res://assets/textures/stone.jpg") and color.s<0.32 and color.v>0.28:
  m.albedo_texture=load("res://assets/textures/stone.jpg")
  m.uv1_scale=Vector3(0.4,0.4,0.4)
 materials[key]=m
 return m

func box(parent: Node3D, pos: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
 var n=MeshInstance3D.new()
 var mesh=BoxMesh.new()
 mesh.size=size
 n.mesh=mesh
 n.material_override=mat(color)
 n.position=pos
 parent.add_child(n)
 return n

func cylinder(parent: Node3D, pos: Vector3, radius: float, height: float, color: Color, top=-1.0) -> MeshInstance3D:
 var n=MeshInstance3D.new()
 var mesh=CylinderMesh.new()
 mesh.top_radius=radius if top<0 else top
 mesh.bottom_radius=radius
 mesh.height=height
 mesh.radial_segments=16
 n.mesh=mesh
 n.material_override=mat(color)
 n.position=pos
 parent.add_child(n)
 return n

func cell_position(cell: Array) -> Vector3:
 return Vector3(float(cell[0])-3.5,0,float(cell[1])-3.5)

func terrain():
 box(self,Vector3(0,-1.05,0),Vector3(11.3,0.45,11.3),Color("3c2f27"))
 box(self,Vector3(0,-0.8,0),Vector3(10.9,0.12,10.9),Color("b09a63"))
 box(self,Vector3(0,-0.70,0),Vector3(10.65,0.15,10.65),Color("234346"))
 var water=box(self,Vector3(0,-0.54,0),Vector3(10.4,0.02,10.4),Color("244f51"))
 var shader=Shader.new()
 shader.code="shader_type spatial; render_mode cull_disabled; uniform vec3 tint : source_color = vec3(0.08,0.23,0.25); void fragment(){ float wave=sin(UV.x*130.0+TIME*0.7+sin(UV.y*48.0))*sin(UV.y*83.0-TIME*0.45); ALBEDO=tint+vec3(0.025)*wave; ROUGHNESS=0.35; METALLIC=0.35; }"
 water_material=ShaderMaterial.new()
 water_material.shader=shader
 water.material_override=water_material
 for z in range(8):
  for x in range(8):
   var p=cell_position([x,z])
   var river=z in [3,4] and (x<2 or x>5)
   if river: continue
   var stone=Color("a3a18e").darkened(rng.randf_range(0.0,0.18))
   var tile=box(self,p+Vector3(0,-0.14,0),Vector3(0.975,0.26,0.975),stone)
   tiles[str([x,z])]=tile
   if z not in [3,4]:
    box(self,p+Vector3(0,-0.44,0),Vector3(0.99,0.38,0.99),Color("53605a").darkened(rng.randf_range(0,0.2)))
   # Irregular smaller cobbles break the manufactured grid without concealing it.
   for i in range(3):
    var offset=Vector3(rng.randf_range(-0.34,0.34),0.007,rng.randf_range(-0.34,0.34))
    box(self,p+offset,Vector3(rng.randf_range(0.1,0.2),0.022,rng.randf_range(0.1,0.2)),stone.lightened(0.055))
 for p in [[0,2],[1,2],[6,5],[7,5]]:
  for i in range(3):
   var rock=box(self,cell_position(p)+Vector3(rng.randf_range(-0.2,0.2),0.17+i*0.16,rng.randf_range(-0.2,0.2)),Vector3(0.6,0.28,0.48),Color("626a60"))
   rock.rotation_degrees.y=rng.randf_range(-20,20)
 # Stone parapets mark the edge of the crossing; the playable interior stays clear.
 for z in [2.8,3.7,4.6]:
  for x in [1.5,5.5]:
   box(self,Vector3(x-3.5,0.27,z-3.5),Vector3(0.13,0.55,0.58),Color("777b67"))
 for p in [Vector3(-4.45,0,-3.3),Vector3(4.4,0,3.7),Vector3(-4.5,0,2.7),Vector3(3.8,0,-4.3)]:
  tree(p,rng.randf_range(1.5,2.4))
 for p in [Vector3(-4.3,0,-1.5),Vector3(4.1,0,1.7),Vector3(-2.8,0,-4.4)]:
  ruin(p)
 for p in [Vector3(-1.7,0,1.8),Vector3(1.9,0,-2.7)]:
  banner(p)
 for i in range(70):
  var p=Vector3(rng.randf_range(-5,5),-0.48,rng.randf_range(-5,5))
  if absf(p.x)<4 and absf(p.z)<4: continue
  var rock=box(self,p,Vector3(rng.randf_range(0.12,0.4),0.18,rng.randf_range(0.1,0.4)),Color("557369").darkened(rng.randf_range(0,0.2)))
  rock.rotation_degrees.y=rng.randf_range(0,360)
 # A small brass maker's plate on the near side of the wooden table.
 box(self,Vector3(0,-0.91,5.67),Vector3(1.8,0.19,0.02),Color("b39457"))
 for x in range(8):
  annotation(String.chr(65+x),Vector3(x-3.5,0.05,4.18))
 for z in range(8): annotation(str(z+1),Vector3(-4.22,0.05,z-3.5))
 prop("barrel_large_decorated.gltf.glb",Vector3(-4.25,-0.25,3.7),0.65)
 prop("crates_stacked.gltf.glb",Vector3(4.2,-0.3,-3.4),0.7)
 for p in [Vector3(-1.75,0,1.55),Vector3(1.8,0,-1.1)]:
  prop("torch_lit.gltf.glb",p,0.8)
  var light=OmniLight3D.new()
  light.position=p+Vector3(0,1.2,0)
  light.light_color=Color("ffbc64")
  light.light_energy=0.8
  light.omni_range=2.5
  add_child(light)

func prop(file: String,pos: Vector3,scale_factor: float):
 var path="res://assets/models/"+file
 if not ResourceLoader.exists(path): return
 var instance=load(path).instantiate()
 add_child(instance)
 instance.position=pos
 instance.scale=Vector3.ONE*scale_factor

func annotation(text: String,pos: Vector3):
 var l=Label3D.new()
 l.text=text
 l.position=pos
 l.billboard=BaseMaterial3D.BILLBOARD_ENABLED
 l.font_size=32
 l.pixel_size=0.006
 l.modulate=Color("c5bd99")
 add_child(l)

func tree(pos: Vector3,height: float):
 cylinder(self,pos+Vector3(0,height*0.3,0),0.09,height*0.8,Color("584b36"))
 for i in range(3):
  cylinder(self,pos+Vector3(0,height*0.42+i*height*0.22,0),0.72-i*0.16,height*0.62,Color("365b4e").lightened(i*0.025),0.0)

func ruin(pos: Vector3):
 for i in range(5):
  var brick=box(self,pos+Vector3(0,i*0.25,0),Vector3(0.68,0.24,0.55),Color("797e6a").lightened(i*0.025))
  brick.rotation_degrees.y=5 if i%2 else -5
 box(self,pos+Vector3(0,1.3,0),Vector3(0.82,0.14,0.68),Color("a0a08a"))

func banner(pos: Vector3):
 cylinder(self,pos+Vector3(0,1.1,0),0.035,2.2,Color("725b3e"))
 cylinder(self,pos+Vector3(0,2.26,0),0.065,0.13,Color("d1ac63"),0.0)
 var cloth=box(self,pos+Vector3(0.23,1.74,0),Vector3(0.43,0.72,0.025),Color("a45735"))
 cloth.rotation_degrees.z=-4
 box(self,pos+Vector3(0.23,1.79,0.017),Vector3(0.045,0.42,0.015),Color("e0c58b"))
 box(self,pos+Vector3(0.23,1.84,0.02),Vector3(0.24,0.05,0.015),Color("e0c58b"))

func miniature(u: Dictionary) -> Node3D:
 var root=Node3D.new()
 var base=Color("709c94") if u.team=="ally" else Color("b66c50")
 cylinder(root,Vector3(0,0.07,0),0.36,0.12,Color("343b34"))
 cylinder(root,Vector3(0,0.14,0),0.35,0.03,base)
 var model_name={"captain":"Knight","ranger":"Rogue_Hooded","mage":"Mage","skeleton":"Skeleton_Warrior","archer":"Skeleton_Rogue","boss":"Skeleton_Warrior"}.get(u.role,"")
 var path="res://assets/models/"+model_name+".glb"
 if model_name!="" and ResourceLoader.exists(path):
  var model=load(path).instantiate()
  root.add_child(model)
  model.position.y=0.16
  model.scale=Vector3.ONE*(0.62 if u.role!="boss" else 0.8)
  model.rotation.y=PI if u.team=="ally" else 0
  if u.role=="captain":
   var weapon_path="res://assets/models/weapons/sword_1handed.gltf"
   if ResourceLoader.exists(weapon_path):
    var weapon=load(weapon_path).instantiate()
    root.add_child(weapon)
    weapon.position=Vector3(0.26,0.65,0.05)
    weapon.scale=Vector3.ONE*0.65
    weapon.rotation_degrees=Vector3(0,0,-15)
  var player=find_player(model)
  if player:
   for clip in player.get_animation_list():
    if "idle" in clip.to_lower():
     player.get_animation(clip).loop_mode=Animation.LOOP_LINEAR
     player.play(clip)
     break
 elif u.role=="wolf":
  wolf(root)
 elif u.role=="owl":
  var bird=cylinder(root,Vector3(0,0.85,0),0.2,0.5,Color("bbaa89"),0.15)
  box(root,Vector3(0,1.04,-0.16),Vector3(0.3,0.25,0.18),Color("d5c9a9"))
  for x in [-0.3,0.3]:
   var wing=box(root,Vector3(x,0.86,0),Vector3(0.4,0.07,0.24),Color("958872"))
   wing.rotation.z=0.25 if x>0 else -0.25
 elif u.role=="ballista":
  box(root,Vector3(0,0.55,0),Vector3(0.7,0.16,0.22),Color("786048"))
  box(root,Vector3(0,0.6,0),Vector3(0.11,0.1,0.8),Color("bfb4a0"))
  for x in [-0.22,0.22]: cylinder(root,Vector3(x,0.3,0),0.07,0.38,Color("67543f"))
 var label=Label3D.new()
 label.name="Status"
 label.position=Vector3(0,1.72 if u.role!="boss" else 2.05,0)
 label.billboard=BaseMaterial3D.BILLBOARD_ENABLED
 label.no_depth_test=true
 label.font_size=38
 label.pixel_size=0.006
 label.outline_size=12
 label.modulate=Color("eae5d2")
 root.add_child(label)
 return root

func find_player(node):
 if node is AnimationPlayer: return node
 for child in node.get_children():
  var result=find_player(child)
  if result: return result
 return null

func wolf(root: Node3D):
 var fur=Color("a8afa0")
 box(root,Vector3(0,0.48,0),Vector3(0.32,0.3,0.67),fur)
 box(root,Vector3(0,0.7,-0.25),Vector3(0.29,0.31,0.32),fur.lightened(0.12))
 box(root,Vector3(0,0.65,-0.48),Vector3(0.19,0.14,0.25),fur)
 box(root,Vector3(0,0.66,-0.6),Vector3(0.13,0.1,0.045),Color("303632"))
 for x in [-0.11,0.11]:
  cylinder(root,Vector3(x,0.94,-0.22),0.08,0.21,fur,0.0)
  for z in [-0.2,0.22]: box(root,Vector3(x,0.3,z),Vector3(0.085,0.26,0.09),fur.darkened(0.15))
 var tail=box(root,Vector3(0,0.53,0.48),Vector3(0.12,0.12,0.4),fur)
 tail.rotation.x=-0.4

func sync(state, selected: String, ability: String, is_camp=false):
 game=state
 active=selected
 order=ability
 camp=is_camp
 var units=state.battle.get("units",[])
 var next_biome=int(state.battle.get("mission",0))
 if biome!=next_biome:
  biome=next_biome
  var tint=Color("b3bbb1") if biome==4 else (Color("9aaa82") if biome==3 else Color("aaa28d"))
  if biome==5: tint=Color("87818f")
  for tile in tiles.values():
   var m=tile.material_override.duplicate()
   m.albedo_color=tint.darkened(rng.randf_range(0.0,0.12))
   tile.material_override=m
 if camp:
  units=[state.unit("rowan","Rowan","ally",[2,5],22,5,1,"captain"),state.unit("lysa","Lysa","ally",[3,6],16,4,4,"ranger"),state.unit("fen","Fen","ally",[1,6],15,4,1,"wolf")]
  if state.campaign.mage: units.append(state.unit("merrin","Merrin","ally",[1,5],15,4,3,"mage"))
 var alive=[]
 for u in units:
  if u.hp<=0: continue
  alive.append(u.id)
  if not pieces.has(u.id):
   pieces[u.id]=miniature(u)
   add_child(pieces[u.id])
   pieces[u.id].position=cell_position(u.pos)
  var node=pieces[u.id]
  var dest=cell_position(u.pos)
  if node.position.distance_to(dest)>0.01:
   if active_tweens.has(u.id) and active_tweens[u.id].is_valid(): active_tweens[u.id].kill()
   var tween=create_tween()
   active_tweens[u.id]=tween
   tween.tween_property(node,"position",dest,0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
  var label=node.get_node("Status")
  label.text=u.name if camp or u.id==active else str(u.hp)
  label.font_size=36 if u.id==active else 30
  label.modulate=Color("f6d48c") if u.id==active and not camp else (Color("f0e7ce") if u.team=="ally" else Color("ffc2a3"))
 for id in pieces.keys():
  if id not in alive:
   pieces[id].queue_free()
   pieces.erase(id)
 update_highlights()

func feedback(before: Dictionary,after: Dictionary):
 for u in after.units:
  for previous in before.units:
   if u.id!=previous.id: continue
   var delta=int(u.hp)-int(previous.hp)
   if delta==0: continue
   var number=Label3D.new()
   number.text=("+" if delta>0 else "")+str(delta)
   number.position=cell_position(u.pos)+Vector3(0,1.8,0)
   number.billboard=BaseMaterial3D.BILLBOARD_ENABLED
   number.no_depth_test=true
   number.font_size=64
   number.pixel_size=0.007
   number.outline_size=14
   number.modulate=Color("9ce1bc") if delta>0 else Color("ffc194")
   add_child(number)
   var tween=create_tween()
   tween.tween_property(number,"position:y",2.8,0.85).as_relative()
   tween.parallel().tween_property(number,"modulate:a",0.0,0.85)
   tween.tween_callback(number.queue_free)
   if pieces.has(u.id):
    var recoil=create_tween()
    recoil.tween_property(pieces[u.id],"rotation:z",0.08,0.06)
    recoil.tween_property(pieces[u.id],"rotation:z",0.0,0.12)

func tile_marker(cell: Array,color: Color,height=0.025):
 var n=box(highlights,cell_position(cell)+Vector3(0,height,0),Vector3(0.86,0.025,0.86),color)
 var m=mat(color).duplicate()
 m.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
 m.albedo_color.a=0.38
 m.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
 n.material_override=m

func update_highlights():
 for node in highlights.get_children(): node.queue_free()
 if game==null or camp or game.battle.is_empty(): return
 var u=game.get_unit(active)
 if not u.is_empty() and u.hp>0:
  tile_marker(u.pos,Color("f1ce7c"),0.065)
  var ring=MeshInstance3D.new()
  var ring_mesh=TorusMesh.new()
  ring_mesh.inner_radius=0.38
  ring_mesh.outer_radius=0.43
  ring.mesh=ring_mesh
  ring.material_override=mat(Color("f1ce7c"),0.45)
  ring.position=cell_position(u.pos)+Vector3(0,0.2,0)
  highlights.add_child(ring)
  for y in range(8):
   for x in range(8):
    if order!="guard" and game.action_error(active,order,[x,y])=="": tile_marker([x,y],Color("66b2b1"))
 for e in game.battle.units:
  if e.team!="enemy" or e.hp<=0: continue
  var intent=e.intent
  if intent.get("kind","")=="attack":
   tile_marker(intent.target,Color("f37858"),0.06)
   var marker=Label3D.new()
   marker.text="!  %d" % e.power
   marker.position=cell_position(intent.target)+Vector3(0,0.2,0)
   marker.billboard=BaseMaterial3D.BILLBOARD_ENABLED
   marker.no_depth_test=true
   marker.font_size=38
   marker.pixel_size=0.006
   marker.modulate=Color("ffbba1")
   highlights.add_child(marker)
 if not hover_cell.is_empty() and game.valid_cell(hover_cell):
  tile_marker(hover_cell,Color("ffffff"),0.08)

func input_event(event: InputEvent):
 if camera==null: return
 if event is InputEventMouseButton and event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN]:
  camera.size=clampf(camera.size+(-0.6 if event.button_index==MOUSE_BUTTON_WHEEL_UP else 0.6),8.0,16.0)
  return
 if event is InputEventMouseMotion or event is InputEventMouseButton:
  var point=Plane(Vector3.UP,0).intersects_ray(camera.project_ray_origin(event.position),camera.project_ray_normal(event.position))
  if point==null: return
  var cell=[int(floor(point.x+4)),int(floor(point.z+4))]
  # Pick the figure itself, not the ground behind its head in isometric projection.
  var nearest_depth=INF
  if game!=null and not camp:
   for u in game.battle.get("units",[]):
    if u.hp<=0 or not pieces.has(u.id): continue
    var base=pieces[u.id].position
    var feet=camera.unproject_position(base)
    var head=camera.unproject_position(base+Vector3(0,1.25,0))
    var bounds=Rect2(Vector2(head.x-17,head.y),Vector2(34,maxf(10,feet.y-head.y)))
    var depth=camera.position.distance_to(base)
    if bounds.has_point(event.position) and depth<nearest_depth:
     cell=u.pos.duplicate()
     nearest_depth=depth
  if cell!=hover_cell:
   hover_cell=cell
   cell_hovered.emit(cell)
   update_highlights()
  if event is InputEventMouseButton and event.pressed and event.button_index==MOUSE_BUTTON_LEFT:
   cell_clicked.emit(cell)
