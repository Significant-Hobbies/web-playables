extends SceneTree
const Main=preload("res://scripts/pocket_main.gd")
var screen
func _init(): call_deferred("capture")
func shot(label: String):
 screen.show_page()
 await process_frame
 await process_frame
 await RenderingServer.frame_post_draw
 root.get_texture().get_image().save_png("res://artifacts/expansion/"+label+".png")
func capture():
 if "--pocket-demo" not in OS.get_cmdline_user_args(): quit(1);return
 root.size=Vector2i(1440,900);root.content_scale_size=Vector2i(1440,900);root.content_scale_mode=Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
 DirAccess.make_dir_recursive_absolute("res://artifacts/expansion")
 screen=Main.new();root.add_child(screen);screen.muted=true
 await shot("keep-1440")
 screen.game.begin(0);screen.game.settle(true);screen.page="battle"
 await shot("reward-1440")
 screen.game.claim_banner(screen.game.battle.loot[0]);screen.return_to_keep()
 screen.keep_mode="contracts"
 await shot("contracts-1440")
 screen.keep_mode="banners"
 await shot("banners-1440")
 screen.game.begin_contract("siege",1);screen.page="battle"
 await shot("contract-battle-1440")
 root.size=Vector2i(1152,720)
 await shot("contract-battle-1152")
 screen.game.settle(true)
 await shot("reward-1152")
 screen.game.claim_banner(screen.game.battle.loot[0]);screen.return_to_keep();screen.keep_mode="contracts"
 await shot("contracts-1152")
 screen.keep_mode="banners"
 await shot("banners-1152")
 print("EXPANSION CAPTURES READY")
 quit()
