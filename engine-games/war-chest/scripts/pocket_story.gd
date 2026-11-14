extends RefCounted
## The Last Crossing: the company stays in its world; StoryGame owns every decision.
const Data=preload("res://scripts/story_data.gd")
const Chest=preload("res://scripts/pocket_chest.gd")
const SPEAKERS={"Rowan":"QUARTERMASTER","Lysa":"BORDER SCOUT","Ivo":"LYSA'S BROTHER","Merrin":"ARCHIVE KEEPER","Marshal":"FROST MARSHAL","The Crown":"AUTHOR OF THE TRANSFER"}

class Trail extends Control:
 var current=0
 var completed=0
 func _draw():
  var points=[]
  for i in range(6): points.append(Vector2(104+i*222,40))
  for i in range(6): points.append(Vector2(1214-i*222,73))
  draw_polyline(PackedVector2Array(points),Color("a8ab88"),8,true)
  if completed>0: draw_polyline(PackedVector2Array(points.slice(0,mini(completed+1,12))),Color("739489"),4,true)
  for i in range(12):
   draw_circle(points[i],13,Color("e9b85f") if i==current else (Color("294743") if i<completed else Color("b7baa0")))
   if i==current: draw_arc(points[i],19,0,TAU,32,Color("294743"),2,true)

static func _heading(s,title: String,subtitle: String,chapter=""):
 var background=s.panel(Rect2(32,22,886,130),Color(s.PAPER,0.96))
 if chapter!="": s.text(chapter,Rect2(50,34,840,27),16,s.BLUE)
 s.text(title,Rect2(48,64 if chapter!="" else 40,849,45),34,s.NAVY,true)
 var description=s.text(subtitle,Rect2(51,114 if chapter!="" else 95,841,64),18,s.BLUE)
 background.size.y=maxf(130,description.position.y+description.get_minimum_size().y+12-background.position.y)
 s.button("Menu",Rect2(1250,27,146,49),func():s.guide_return="story" if s.page=="story" else s.page;s.navigate("guide"))

static func _company(s,at: Vector2,scale_value=1.0,speaker=""):
 var positions={"rowan":Rect2(at,Vector2(197,250)*scale_value),"lysa":Rect2(at+Vector2(241,12)*scale_value,Vector2(185,238)*scale_value),"fen":Rect2(at+Vector2(444,140)*scale_value,Vector2(192,112)*scale_value)}
 for id in positions:
  var unit=s.icon(id,positions[id]);unit.set_meta("story_companion",id)
  var tag=positions[id].position+Vector2(0,positions[id].size.y+5)
  s.panel(Rect2(tag,Vector2(145,28)),Color(s.PAPER,0.94))
  s.text({"rowan":"ROWAN","lysa":"LYSA","fen":"FEN"}[id],Rect2(tag+Vector2(9,4),Vector2(133,23)),14,s.BLUE)
 if s.game.campaign.mage or speaker=="Merrin":
  var rect=Rect2(at+Vector2(649,5)*scale_value,Vector2(173,247)*scale_value)
  s.icon("merrin",rect).set_meta("story_companion","merrin" if s.game.campaign.mage else "merrin_guest")
  s.panel(Rect2(rect.position+Vector2(0,rect.size.y+5),Vector2(166,28)),Color(s.PAPER,0.94))
  s.text("MERRIN" if s.game.campaign.mage else "MERRIN · ARCHIVIST",Rect2(rect.position+Vector2(9,rect.size.y+9),Vector2(153,23)),14,s.BLUE)
 elif speaker in ["Marshal","The Crown"]:
  var rect=Rect2(at+Vector2(649,-9)*scale_value,Vector2(186,265)*scale_value)
  s.icon("boss",rect)
  s.panel(Rect2(rect.position+Vector2(0,rect.size.y+5),Vector2(175,28)),Color(s.PAPER,0.94))
  s.text("THE CROWN" if speaker=="The Crown" else "MARSHAL",Rect2(rect.position+Vector2(9,rect.size.y+9),Vector2(159,23)),14,s.BLUE)

static func _preview(s,at: Vector2,scale_value=0.7):
 # A read-only view of the real loadout. No speculative rune placement is applied.
 var extent=Vector2(420,350)*scale_value
 s.panel(Rect2(at-Vector2(17,17),extent+Vector2(34,34)),Color("684f38"))
 s.panel(Rect2(at-Vector2(8,8),extent+Vector2(16,16)),Color("b59766"))
 var chest=Chest.new();chest.game=s.game;chest.selected="";chest.position=at;chest.scale=Vector2.ONE*scale_value
 chest.set_meta("story_chest_preview",true);s.hud.add_child(chest);chest.mouse_filter=Control.MOUSE_FILTER_IGNORE
 s.text("6 × 5 · Your actual packed equipment",Rect2(at+Vector2(-8,extent.y+26),Vector2(440,28)),16,s.PAPER)
 return chest

static func open_pack(s,id="cube"):
 # Story advancement is deliberately separate from navigation and packing.
 if not s.game.battle.is_empty(): return
 s.gear=id if s.game.campaign.items.has(id) else "blade"
 s.chest_cursor=Vector2i(1,0);s.rotation_index=0;s.navigate("chest")

static func scene(s):
 var state=s.game.campaign.story;var node=s.game.story_node();var ending=state.phase=="ending"
 var speech=s.game.story_line();var speaker=speech.get("speaker","")
 s.field.world_state="camp" if ending or state.phase=="outro" else "";s.field.queue_redraw()
 _heading(s,"Every name. Every coin." if ending else node.title,"The company brings the wages back to the households." if ending else node.care,"HOME · THE WINTER WAGES" if ending else "CHAPTER %s · %s" % [["I","II","III"][node.chapter],Data.CHAPTERS[node.chapter].title.to_upper()])
 _company(s,Vector2(294,260),1.03,speaker)
 var options=s.game.story_options();var top=557 if not options.is_empty() else 607
 s.panel(Rect2(48,top,1344,235 if options.is_empty() else 289),Color(s.PAPER,0.97))
 s.panel(Rect2(48,top,4,235 if options.is_empty() else 289),s.GOLD)
 s.text(speaker.to_upper()+" · "+SPEAKERS.get(speaker,"THE COMPANY"),Rect2(71,top+16,1120,28),16,s.BLUE)
 var spoken=s.text("“"+speech.get("text","")+"”",Rect2(70,top+54,1280 if not options.is_empty() else 939,77 if not options.is_empty() else 99),25,s.NAVY,true)
 spoken.set_meta("story_speech",true)
 s.text("%d / %d · %s" % [state.line+1,s.game.story_lines().size(),"Home" if ending else ("After the encounter" if state.phase=="outro" else "Before departure")],Rect2(71,top+155 if options.is_empty() else top+130,910,26),15,s.BLUE)
 if not options.is_empty():
  for i in range(options.size()):
   var option=options[i];var x=71+i*663
   var choice=s.button(option.label,Rect2(x,top+159,639,52),func():s.story_choose(option.id))
   choice.add_theme_font_size_override("font_size",17);choice.set_meta("focus_key","story_choice_"+option.id)
   choice.accessibility_description=option.consequence
   s.text(option.consequence,Rect2(x+3,top+221,628,69),18,s.NAVY)
 else:
  var last=state.line==s.game.story_lines().size()-1
  var next_label=("Keep leading the company →" if ending else ("Prepare the company →" if state.phase=="intro" else "Continue the road →")) if last else "Continue →"
  if last and state.phase=="outro" and node.id=="gate": next_label="Follow Ivo’s trail →"
  var next=s.button(next_label,Rect2(1036,top+155,330,61),s.story_advance,true)
  next.set_meta("focus_key","story_continue")
  if node.id=="gate" and state.phase=="outro": s.text("Next: fit the Storm rune to a weapon.",Rect2(72,top+191,916,27),18,s.BLUE)

static func _route(s):
 var state=s.game.campaign.story
 s.panel(Rect2(32,701,1376,155),Color(s.PAPER,0.94))
 var trail=Trail.new();trail.position=Vector2(40,720);trail.size=Vector2(1360,128);trail.current=int(state.node);trail.completed=state.completed.size();trail.mouse_filter=Control.MOUSE_FILTER_IGNORE;s.hud.add_child(trail)
 for i in range(12):
  var x=144+(i if i<6 else 11-i)*222;var y=760 if i<6 else 793
  s.text(str(i+1),Rect2(x-9,y-10,22,24),13,s.PAPER if i<state.completed.size() else s.NAVY)
  var title=s.text(Data.NODES[i].title,Rect2(x-93,701 if i<6 else 807,188,48),16,s.NAVY,i==state.node)
  title.tooltip_text="Chapter %s · %s" % [["I","II","III"][Data.NODES[i].chapter],Data.NODES[i].care]

static func road(s):
 var state=s.game.campaign.story;var node=s.game.story_node();var preparing=state.phase=="prepare"
 s.field.world_state="camp";s.field.queue_redraw()
 _heading(s,node.title,s.Coach.story_progress(s.game),"THE COMPANY’S ROAD · CHAPTER "+["I","II","III"][node.chapter])
 _company(s,Vector2(99,274),0.8)
 s.panel(Rect2(48,164,747,87),Color(s.PAPER,0.96))
 s.text(node.care,Rect2(65,177,710,70),23,s.NAVY,true)
 s.panel(Rect2(48,520,747,69),Color(s.PAPER,0.95))
 s.text("Merrin now deploys too. Pack his staff for Storm." if s.game.campaign.mage and not s.game.campaign.placements.has("staff") else "All companions deploy. Select one in battle.",Rect2(65,531,710,48),20,s.NAVY)
 _preview(s,Vector2(950,257),0.84)
 var rune=s.game.campaign.items.has("cube") and not (s.game.empowered("blade") or s.game.empowered("bow"))
 if rune:
  s.icon("cube",Rect2(1320,312,62,62),s.GOLD)
  s.text("Storm rune\nstored",Rect2(1312,390,84,80),17,s.PAPER)
  s.text("Storm rune: +2 damage to a touching weapon",Rect2(932,625,450,56),23,s.PAPER,true)
 else: s.text("Packed gear shapes your next orders.",Rect2(932,625,450,56),21,s.PAPER)
 var march=s.button("March with the company →" if preparing else "Continue the conversation →",Rect2(48,592,747,58),s.start_story_battle if preparing else func():s.navigate("story"),true)
 march.set_meta("focus_key","story_march")
 var pack=s.button("Pack equipment",Rect2(851,169,281,49),func():open_pack(s,"cube" if rune else "staff" if s.game.campaign.mage and not s.game.campaign.placements.has("staff") else "blade"),false,not s.game.battle.is_empty())
 pack.tooltip_text="Place the Storm rune beside the sword or bow: +2 command damage." if rune else "Arrange the company's owned equipment in the physical chest."
 s.button("The quartermaster",Rect2(1150,169,242,49),func():s.navigate("shop"))
 s.button("Promises & decisions",Rect2(48,657,366,44),func():s.navigate("journal"))
 s.button("Company banner",Rect2(432,657,363,44),func():s.navigate("story_banners"))
 _route(s)

static func banners(s):
 s.field.world_state="camp";s.field.queue_redraw()
 _heading(s,"The company’s standard","Equip one earned banner before the next encounter. Its effects apply when you march.")
 s.button("← Company road",Rect2(48,158,279,44),func():s.navigate("keep"))
 s.icon("standard",Rect2(120,282,424,482))
 s.panel(Rect2(60,735,626,77),Color(s.PAPER,0.94))
 s.text("A promise the company carries.",Rect2(74,754,594,53),27,s.NAVY,true)
 s.banners_panel()

static func journal(s):
 _heading(s,"Promises kept","The company remembers what you did and what you chose.")
 s.button("← Company road",Rect2(1100,104,296,46),func():s.navigate("keep"))
 var count=s.game.campaign.story.completed.size()
 for index in range(count):
  var node=Data.NODES[index];var x=48+(index%2)*698;var y=184+int(index/2)*110
  s.panel(Rect2(x,y,663,105),Color(s.PAPER,0.95))
  s.panel(Rect2(x,y,4,105),s.GOLD)
  s.text("%02d · %s" % [index+1,node.title],Rect2(x+14,y+9,635,27),20,s.BLUE,true)
  var memory=node.journal
  for option in node.choices:
   if s.game.campaign.story.decisions.get(node.id,"")==option.id: memory+=" "+option.label
  s.text(memory,Rect2(x+14,y+41,635,66),17,s.NAVY)
 if count==0:
  s.panel(Rect2(48,222,950,109),Color(s.PAPER,0.94))
  s.text("Open Lantern Gate. Your first promise is still ahead.",Rect2(66,241,910,80),29,s.NAVY,true)

static func reward(s):
 var won=s.game.battle.phase=="victory";var node=s.game.story_node()
 s.field.world_state="camp";s.field.queue_redraw()
 _heading(s,"A promise kept" if won else "The company withdrew",node.title)
 _company(s,Vector2(101,315),0.81)
 var line=s.game.story_line() if won else {}
 s.panel(Rect2(48,174,747,141),Color(s.PAPER,0.96))
 s.text(line.get("speaker","THE COMPANY").to_upper(),Rect2(66,187,710,25),16,s.BLUE)
 s.text("“"+line.text+"”" if won else "The people and wages still need a way home.",Rect2(64,221,711,94),23,s.NAVY,true)
 s.panel(Rect2(48,570,747,259),Color(s.PAPER,0.94))
 s.text(node.journal if won else "Your companions, equipment and gold are kept.",Rect2(67,591,708,98),24 if not won else 22,s.NAVY,not won)
 if won:
  s.panel(Rect2(823,104,569,89),Color(s.PAPER,0.96))
  s.text("+%d company gold · Company level %d/6" % [s.game.battle.reward,s.game.level()],Rect2(842,119,528,65),25,s.NAVY,true)
  var earned=s.game.battle.get("quest_reward","")
  if node.id=="gate":
   _preview(s,Vector2(851,261))
   s.icon("cube",Rect2(1222,293,90,90),s.GOLD)
   s.text("Storm rune\nrecovered · stored",Rect2(1167,407,210,69),19,s.PAPER)
   s.panel(Rect2(823,570,569,183),Color(s.PAPER,0.96))
   s.text("Cleave 8 → 10",Rect2(842,584,529,37),29,s.NAVY,true)
   s.text("Storm rune recovered. After this conversation, pack it beside the sword or bow: +2 command damage.",Rect2(842,631,527,100),20,s.NAVY)
   s.text(s.Coach.unlock_text(2,true),Rect2(67,710,708,106),19,s.NAVY)
  else:
   if node.id=="relic": earned="Merrin joins free and deploys next battle. Select him with 4; pack his new staff for Storm. Dawn aegis recovered: pack it for +4 Guard block."
   elif s.game.battle.new_level>0: earned=s.Coach.unlock_text(s.game.battle.new_level,true)
   s.panel(Rect2(823,214,569,153),Color(s.PAPER,0.96))
   s.text(earned if earned!="" else "Every deployed companion gains a mastery win. Ranks at 2, 5 and 9 wins apply next battle.",Rect2(842,229,530,129),20,s.NAVY)
   if s.game.has_loot():
    s.panel(Rect2(823,376,569,42),Color("12272b",0.92))
    s.text("Choose the company’s banner",Rect2(836,380,545,35),24,s.PAPER,true)
    for i in range(s.game.battle.loot.size()):
     var id=s.game.battle.loot[i];var rank=int(s.game.war().banners.get(id,0));var y=426+i*103
     s.button(s.Game.BANNERS[id].name+(" · Rank %d" % (rank+1) if rank<3 else " · Mastered: +40 gold"),Rect2(823,y,569,48),func():s.transact(func():s.game.claim_banner(id))).set_meta("focus_key","story_banner_"+id)
     s.panel(Rect2(823,y+49,569,48),Color(s.PAPER,0.95))
     s.text(s.game.banner_text(id,mini(3,rank+1)),Rect2(835,y+53,545,42),17,s.NAVY)
   else:
    _preview(s,Vector2(876,443),0.71)
    s.text(s.game.battle.get("claim_message","The company is ready to hear what comes next."),Rect2(67,710,708,87),22,s.NAVY)
  var continue_story=s.button("Choose a banner first" if s.game.has_loot() else "Hear the company →",Rect2(823,773,569,64),func():s.navigate("story"),true,s.game.has_loot())
  continue_story.set_meta("focus_key","story_reward_continue")
 else:
  s.panel(Rect2(823,214,569,340),Color(s.PAPER,0.96))
  s.text("Another way through.",Rect2(842,236,530,56),31,s.NAVY,true)
  s.text(s.game.battle.get("story_failure",s.game.battle.get("quest_failure","Read the enemy’s next attack. Protect a threatened companion, and keep the objective in reach.")),Rect2(842,315,530,205),25,s.NAVY)
  s.button("Prepare another attempt →",Rect2(823,773,569,64),s.return_to_keep,true).set_meta("focus_key","story_retry")
