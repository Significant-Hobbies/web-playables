extends SceneTree
## Local-only pack: explicit runtime closure, no player data or old prototypes.
const FILES=[
 "project.godot","scenes/pocket.tscn",
 "scripts/game.gd","scripts/siege_game.gd","scripts/pocket_campaign.gd",
 "scripts/hero_campaign.gd","scripts/journey_game.gd","scripts/opening_game.gd","scripts/pocket_main.gd",
 "scripts/story_data.gd","scripts/story_game.gd","scripts/pocket_story.gd",
 "scripts/pocket_field.gd","scripts/pocket_art.gd","scripts/pocket_chest.gd","scripts/crossing_world.gd",
 "scripts/pocket_motion.gd","scripts/pocket_coach.gd","scripts/pocket_unlock.gd","scripts/command_preview.gd",
 "tests/test_journey.gd","tests/test_journey_ui.gd","tests/test_motion.gd","tests/test_onboarding.gd",
 "tests/test_opening.gd","tests/test_opening_boot.gd","tests/test_stability.gd","tests/test_pocket_ui.gd",
 "tests/test_story.gd","tests/test_story_campaign.gd","tests/test_story_ui.gd","tests/test_story_slots.gd","tests/test_command_preview.gd","tests/test_crossing_story.gd"
]
const IMAGES=["company-atlas.png","lantern-gate.png"]

func _init():
 var args=OS.get_cmdline_user_args()
 if args.size()!=1 or not args[0].is_absolute_path():
  push_error("Pass one absolute output directory.");quit(1);return
 var directory=args[0]
 if not DirAccess.dir_exists_absolute(directory) or FileAccess.file_exists(directory.path_join("War Chest.pck")):
  push_error("Output must exist and contain no previous pack.");quit(1);return
 var paths=FILES.duplicate()
 for image in IMAGES:
  var source="assets/banner-steel/"+image
  var imported=ConfigFile.new()
  if imported.load("res://"+source+".import")!=OK:
   push_error("Import the artwork first: "+source);quit(1);return
  paths.append(source);paths.append(source+".import")
  for dependency in imported.get_value("deps","dest_files",[]):
   paths.append(str(dependency).trim_prefix("res://"))
 for path in paths:
  if not FileAccess.file_exists("res://"+path):
   push_error("Missing required local content: "+path);quit(1);return
 var pack=PCKPacker.new()
 if pack.pck_start(directory.path_join("War Chest.pck"))!=OK:
  push_error("Cannot create game pack.");quit(1);return
 var manifest=[]
 for path in paths:
  if pack.add_file("res://"+path,"res://"+path)!=OK:
   push_error("Cannot pack: "+path);quit(1);return
  manifest.append({"path":path,"sha256":FileAccess.get_sha256("res://"+path)})
 if pack.flush()!=OK:
  push_error("Cannot finish game pack.");quit(1);return
 var license_text=Engine.get_license_text()+"\n\nTHIRD-PARTY COPYRIGHT NOTICES\n"+JSON.stringify(Engine.get_copyright_info(),"  ")+"\n\nTHIRD-PARTY LICENSE TEXTS\n"+JSON.stringify(Engine.get_license_info(),"  ")
 if not write_text(directory.path_join("GODOT-NOTICES.txt"),license_text):return
 if not write_text(directory.path_join("content-manifest.json"),JSON.stringify({"engine":Engine.get_version_info().string,"files":manifest,"player_data_included":false},"  ")):return
 print("LOCAL PACK: %d files, all required artwork included, no player saves" % paths.size())
 quit(0)

func write_text(path: String,contents: String) -> bool:
 var file=FileAccess.open(path,FileAccess.WRITE)
 if file==null:push_error("Cannot write "+path);quit(1);return false
 file.store_string(contents);file.flush()
 if file.get_error()!=OK:push_error("Cannot finish "+path);quit(1);return false
 return true
