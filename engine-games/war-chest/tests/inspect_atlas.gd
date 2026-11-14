extends SceneTree
func _init():
 var args=OS.get_cmdline_user_args()
 if args.is_empty(): quit(1);return
 var picture=Image.load_from_file(args[0])
 print("Size: ",picture.get_size())
 for point in [Vector2i(0,0),Vector2i(512,512),Vector2i(20,250),Vector2i(1500,1000)]:
  print(point," alpha: ",picture.get_pixelv(point).a)
 quit()
