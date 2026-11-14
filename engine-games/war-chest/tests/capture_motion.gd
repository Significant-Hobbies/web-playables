extends SceneTree
const Main=preload("res://scripts/pocket_main.gd")
var screen
var frame=0
var output="res://artifacts/motion"
func _init(): call_deferred("capture")
func frames(label: String,count=20):
 for i in range(count):
  await process_frame
  await RenderingServer.frame_post_draw
  var img=root.get_texture().get_image()
  img.save_png(output+"/frame-%04d.png" % frame)
  if i in [0,1,2,6,12,19]: img.save_png(output+"/%s-%02d.png" % [label,i])
  frame+=1
func reset():
 screen.cancel_combat_animation();screen.game.new_campaign()
 screen.game.campaign.xp=140;screen.game.campaign.unlocked=2;screen.game.campaign.mage=true
 screen.game.campaign.items.staff=0;screen.game.campaign.items.flask=0
 screen.game.place("staff",4,2,0);screen.game.place("flask",0,3,0)
 screen.game.campaign.mastery={"rowan":2,"merrin":2}
 screen.game.begin(0);screen.page="battle";screen.selected="rowan";screen.chosen="";screen.target="";screen.battle_notice="";screen.show_page()
func capture():
 if "--pocket-demo" not in OS.get_cmdline_user_args(): quit(1);return
 root.size=Vector2i(1152,720);root.content_scale_size=Vector2i(1440,900);root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 if "--motion-wide" in OS.get_cmdline_user_args():
  root.size=Vector2i(1440,900);output="res://artifacts/motion-wide"
 DirAccess.make_dir_recursive_absolute(output)
 screen=Main.new();root.add_child(screen);screen.muted=true
 reset();await frames("before",4)
 screen.choose_card("cleave");screen.on_actor("enemy_1");await frames("cleave")
 reset();screen.select_hero("lysa");screen.choose_card("volley");screen.on_actor("enemy_1");await frames("volley")
 reset();screen.game.foe("enemy_1").hp=35;screen.game.foe("enemy_1").max_hp=35
 screen.select_hero("merrin");screen.choose_card("spark");screen.on_actor("enemy_1");await frames("storm")
 reset();screen.game.ally("lysa").hp=10;screen.select_hero("merrin");screen.choose_card("mend");screen.on_actor("lysa");await frames("heal")
 reset();screen.move_to(2);await frames("move")
 screen.choose_card("guard");await frames("guard")
 screen.resolve_turn();await frames("enemy-turn")
 screen.game.battle.round=4;screen.resolve_turn();await frames("victory",26)
 reset();screen.reduced_motion=true;screen.show_page();screen.choose_card("cleave");screen.on_actor("enemy_1");await frames("reduced",4)
 print("MOTION CAPTURES: %d frames" % frame)
 quit()
