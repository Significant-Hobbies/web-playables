extends "res://tests/test_story_ui.gd"
## Native callback regressions use disposable absolute slots, never player storage.
## The rescue state is the shared validated UI fixture, not earned-route proof.
var storage=""

func write_slot(path: String,value: String):
 var file=FileAccess.open(path,FileAccess.WRITE)
 check(file!=null,"Disposable malformed slot can be written")
 if file!=null: file.store_string(value);file.close()

func read_slot(path: String) -> String:
 return FileAccess.get_file_as_string(path)

func run():
 if "--story-demo" not in OS.get_cmdline_user_args():
  push_error("Story slot tests require --story-demo to skip player saves and settings.");quit(1);return
 storage=OS.get_cache_dir().path_join("war-chest-test-saves/story-slots-%d-%d" % [OS.get_process_id(),Time.get_ticks_usec()])
 for argument in OS.get_cmdline_user_args():
  if argument.begins_with("--story-slot-test-storage="):
   storage=argument.trim_prefix("--story-slot-test-storage=")
   if not storage.is_absolute_path():
    push_error("Story slot test storage must be an absolute isolated path.");quit(1);return
 if DirAccess.make_dir_recursive_absolute(storage)!=OK:
  push_error("Cannot create disposable story slot storage.");quit(1);return
 var screen=Main.new()
 screen.legacy_save=storage.path_join("legacy.json")
 screen.story_save=storage.path_join("story.json")
 screen.save_path=screen.legacy_save
 root.add_child(screen);screen.muted=true;screen.reduced_motion=true
 await process_frame
 check(screen.demo and screen.game.story_active(),"Main starts in isolated story-demo mode before file callbacks")
 var rescue=fixture(2,{})
 rescue.war().banners={"ember":1};rescue.war().equipped="ember"
 rescue.begin_story_node();rescue.battle.quest.progress=2;rescue.settle(true)
 install(screen,rescue,"battle")
 var banner=rescue.battle.loot[0]
 press(screen,"story_banner_"+banner)
 check(focus_key(screen)=="story_reward_continue","Claim hands keyboard focus to enabled story dialogue")
 check(banner!="ember" and rescue.war().equipped=="ember" and rescue.war().banners.has(banner),"A later earned banner is owned while the earlier standard stays equipped")
 rescue.campaign.story.line=rescue.story_lines().size()-1
 rescue.choose_story_option("reinforce");rescue.advance_story()
 rescue.campaign.story.line=rescue.story_lines().size()-1;rescue.advance_story()
 install(screen,rescue,"keep")
 press(screen,"Company banner")
 check(screen.page=="story_banners","Story preparation exposes banner equipment")
 press_prefix(screen,screen.Game.BANNERS[banner].name)
 check(rescue.war().equipped==banner,"Actual banner page invokes legal equipment action")
 var original=StoryGame.new()
 check(original.save_to(screen.legacy_save),"Original company saved only to disposable storage")
 var original_bytes=read_slot(screen.legacy_save)
 var saved_story=StoryGame.new();saved_story.enroll_story();saved_story.advance_story()
 check(saved_story.save_to(screen.story_save),"Unread story line saved only to disposable storage")
 install(screen,original,"keep");screen.demo=false
 screen.start_new_story()
 check(screen.save_path==screen.story_save and screen.game.story_active() and screen.game.campaign.story.line==1,"Separate-slot switch restores the exact unread story line")
 check(read_slot(screen.legacy_save)==original_bytes,"Entering story leaves original company bytes unchanged")
 var malformed="{invalid legacy";write_slot(screen.legacy_save,malformed)
 screen.open_original_company()
 check(screen.game.save_locked and screen.save_path==screen.legacy_save,"Opening malformed original keeps its save locked")
 screen.guide_return="keep";screen.navigate("guide")
 var resume=control(screen,"Continue story mode")
 check(resume!=null and not resume.disabled,"Healthy story remains available from malformed original")
 press(screen,"Continue story mode")
 check(screen.game.story_active() and not screen.game.save_locked and screen.game.campaign.story.line==1,"Resume exits malformed original into the healthy story")
 check(read_slot(screen.legacy_save)==malformed,"Resume never overwrites the malformed original")
 write_slot(screen.story_save,"{invalid story")
 screen.open_original_company();screen.guide_return="keep";screen.navigate("guide")
 var kept_game=screen.game
 screen.start_new_story()
 check(screen.game==kept_game and read_slot(screen.story_save)=="{invalid story","Malformed target is preserved without replacing the current company")
 check(screen.story_open_error.contains(screen.story_save),"Rejected target retains its own recovery path")
 check(contains_text(screen,screen.story_save) and contains_text(screen,"original company save also needs recovery"),"When both slots are malformed, target recovery is visible and source status stays truthful")
 check(read_slot(screen.legacy_save)==malformed,"Rejected target leaves malformed original bytes unchanged")
 # Exercise the production boot selector separately from demo _ready/settings.
 screen.legacy_save=storage.path_join("boot-empty-original.json")
 screen.story_save=storage.path_join("boot-new-story.json")
 screen.story_open_error=""
 screen.load_local_company()
 check(screen.save_path==screen.story_save and screen.game.story_active() and screen.game.campaign.story.phase=="intro" and screen.game.campaign.story.line==0 and FileAccess.file_exists(screen.story_save),"Fresh normal boot enrolls and saves the first story scene")
 check(not FileAccess.file_exists(screen.legacy_save),"Fresh story boot creates no original company slot")
 screen.story_advance()
 var unread=screen.game.snapshot();var story_bytes=read_slot(screen.story_save)
 screen.load_local_company()
 check(screen.game.snapshot()==unread and screen.game.campaign.story.line==1 and screen.field.game==screen.game and read_slot(screen.story_save)==story_bytes,"Story boot restores the exact saved unread line and keeps the field synchronized")
 screen.legacy_save=storage.path_join("boot-existing-original.json")
 screen.story_save=storage.path_join("boot-absent-story.json")
 check(original.save_to(screen.legacy_save),"Legacy-only boot seed uses disposable storage")
 var legacy_bytes=read_slot(screen.legacy_save)
 screen.load_local_company()
 check(screen.save_path==screen.legacy_save and not screen.game.campaign.has("story") and not screen.game.enroll_story() and not FileAccess.file_exists(screen.story_save) and read_slot(screen.legacy_save)==legacy_bytes,"Legacy-only boot restores the original without story enrollment or a new slot")
 var damaged_story="{invalid boot story";write_slot(screen.story_save,damaged_story)
 screen.load_local_company()
 check(screen.save_path==screen.story_save and screen.game.save_locked and not screen.game.story_active() and screen.game.save_error.contains(screen.story_save),"Existing malformed story takes startup priority and reports its locked recovery path")
 check(read_slot(screen.story_save)==damaged_story and read_slot(screen.legacy_save)==legacy_bytes,"Malformed story boot preserves both save files without replacement enrollment")
 screen.demo=true;screen.queue_free();await process_frame;await process_frame
 print("STORY SLOT TESTS: %d checks, %d failures" % [checks,failures])
 quit(1 if failures else 0)
