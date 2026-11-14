extends RefCounted
## Authored narrative content. State and battle rules live in story_game.gd.
const CHAPTERS=[
 {"title":"The Gate We Opened","theme":"A company begins with the people it refuses to leave outside."},
 {"title":"Names in the Ledger","theme":"Follow the missing wages, and learn whose orders you have been carrying out."},
 {"title":"What We Keep","theme":"Recover the chest. Decide what is worth defending on the way home."}
]
const NODES=[
 {"id":"gate","chapter":0,"kind":"main","mission":0,"xp":70,"title":"The Lantern Gate",
 "care":"Get the families through the gate before the raiders reach them.",
 "intro":[
  {"speaker":"Lysa","text":"There are families below the causeway. Twelve carts. My brother went down to count them. He hasn't come back."},
  {"speaker":"Rowan","text":"The captain ordered the outer gate shut. I signed that order."},
  {"speaker":"Lysa","text":"Then open it. I'll cover the bridge. Fen—stay with him."}],
 "outro":[
  {"speaker":"Lysa","text":"The last cart is inside. Ivo isn't. One of the raiders was carrying this rune."},
  {"speaker":"Rowan","text":"Army issue. I used to sign for crates of them. Someone gave those men our supplies."},
  {"speaker":"Lysa","text":"Fit it to a weapon. Then help me find my brother."}],
 "journal":"We opened Lantern Gate. The families are inside; Ivo is still missing. The raiders carried an army rune.","choices":[]},
 {"id":"ashen","chapter":0,"kind":"main","mission":1,"xp":0,"title":"Break the Ashen Line",
 "care":"Break the roadblock so Lysa can follow Ivo's trail.",
 "intro":[
  {"speaker":"Lysa","text":"Fen found Ivo's scarf beside the roadblock. No blood. He was taken through alive."},
  {"speaker":"Rowan","text":"Those shields belong to the levy. They were meant to keep this road open."},
  {"speaker":"Lysa","text":"Ask them why after we're through. Right now, help me make a gap."}],
 "outro":[
  {"speaker":"Rowan","text":"A ration slip. Ivo signed it yesterday. He's at the old watch post."},
  {"speaker":"Lysa","text":"You knew the stamp before you read his name."},
  {"speaker":"Rowan","text":"I issued it. I didn't know who would be sent here. I should have asked."}],
 "journal":"The roadblock used levy shields. Ivo's ration slip points to the old watch post.","choices":[]},
 {"id":"scout","chapter":0,"kind":"quest","quest":"scout","xp":0,"title":"The Missing Scout",
 "care":"Bring Rowan to Ivo on the Lower gate, then escort him back to the High wall alive.",
 "intro":[
  {"speaker":"Lysa","text":"There. Under the broken standard. That's Ivo."},
  {"speaker":"Rowan","text":"He can't walk that bridge alone. I'll go down and bring him back. Keep the path clear."},
  {"speaker":"Lysa","text":"Fen knows his scent. Follow him. And Rowan—don't come back without my brother."}],
 "outro":[
  {"speaker":"Ivo","text":"They weren't looking for raiders. They were looking for our pay chest. Every household's winter wages are in it."},
  {"speaker":"Lysa","text":"We thought the wagons were bringing food."},
  {"speaker":"Ivo","text":"They took the wages, then told us to buy our own food. I've got one cart of supplies left. We need to get it through."}],
 "journal":"Ivo is safe. The missing chest contains the households' winter wages, not a royal treasure.",
 "choices":[
  {"id":"reinforce","label":"Use the recovered steel to reinforce the cart.","consequence":"The cart starts with 30 health. Keep Rowan with it through all four escort stages."},
  {"id":"decoy","label":"Use the steel and lanterns to build a decoy.","consequence":"The cart starts with 25 health, but the decoy draws an enemy away from the first escort front."}]},
 {"id":"convoy","chapter":0,"kind":"quest","quest":"convoy","xp":70,"title":"The Last Supply Cart",
 "care":"Bring Ivo's supply cart home. A missed escort stage costs its cargo.",
 "intro":[
  {"speaker":"Ivo","text":"Flour, lamp oil, medicine. I can replace the cart. I can't replace what's in it."},
  {"speaker":"Rowan","text":"I'll stay beside the wheels. The bridge bends through every front—call the next turn before I miss it."},
  {"speaker":"Lysa","text":"I'll watch the far bank. Fen, no chasing. You're working today."}],
 "outro":[
  {"speaker":"Ivo","text":"The baker asked who to thank. What do I call you?"},
  {"speaker":"Rowan","text":"A company. Not the captain's company. Ours."},
  {"speaker":"Lysa","text":"Tell her we'll come back for the names on that pay chest. All of them."}],
 "journal":"The supply cart reached Lantern Gate. Ivo stayed to distribute it. We promised to recover the winter wages.","choices":[]},
 {"id":"bell","chapter":1,"kind":"main","mission":2,"xp":0,"title":"The Bell Tower",
 "care":"Keep the signal tower standing so the valley can hear that the road is open.",
 "intro":[
  {"speaker":"Lysa","text":"Nobody lit the village lamps. They don't know the gate opened."},
  {"speaker":"Rowan","text":"This bell reaches the whole valley. They know it too. That's why the sappers are here."},
  {"speaker":"Lysa","text":"Then we hold it. Ivo shouldn't have to tell every frightened family by himself."}],
 "outro":[
  {"speaker":"Merrin","text":"I heard the bell from the flooded archive. I thought I'd imagined it."},
  {"speaker":"Rowan","text":"We're looking for a levy chest. Did it come through here?"},
  {"speaker":"Merrin","text":"Yes. I wrote its inventory. My copy is under the water. Help me recover it, and I'll show you where they took it."}],
 "journal":"The bell rang. Merrin kept a second inventory of the missing chest in the flooded archive.","choices":[]},
 {"id":"relic","chapter":1,"kind":"quest","quest":"relic","xp":0,"title":"The Sunken Reliquary",
 "care":"Protect the recovery at the Lower gate, then carry the archive seal back out.",
 "intro":[
  {"speaker":"Merrin","text":"The seal holds the water back from the last shelf. Protect whoever holds it while I lift the ledger. Then bring the seal back—we'll need it again."},
  {"speaker":"Lysa","text":"Will the water fall if we break it?"},
  {"speaker":"Merrin","text":"The roof will. Shield the carrier. Don't let the last safe path become another trap."}],
 "outro":[
  {"speaker":"Merrin","text":"Here. A widow's wage. A miller's pension. A child's apprenticeship. They crossed the names out and wrote 'winter engine' over the total."},
  {"speaker":"Rowan","text":"My seal is on the transfer."},
  {"speaker":"Merrin","text":"Then help us undo it. I'll come with you. I know what these runes can do when someone uses them carefully."}],
 "journal":"The ledger is recovered. Rowan authorized the transfer. Merrin joined to help return the wages and stop the engines.","choices":[]},
 {"id":"beacons","chapter":1,"kind":"quest","quest":"beacons","xp":70,"title":"Light the Watchfires",
 "care":"Light all three watchfires so the scattered households can follow a safe road.",
 "intro":[
  {"speaker":"Lysa","text":"The farms can see these three ridges. One fire isn't enough; the river fog hides it."},
  {"speaker":"Merrin","text":"Move a living carrier to each ridge and keep them safe until the fire catches."},
  {"speaker":"Rowan","text":"We carried orders across this valley for years. Tonight we carry a way home."}],
 "outro":[
  {"speaker":"Lysa","text":"Look. Answering lamps. Ivo won't be alone at the gate anymore."},
  {"speaker":"Merrin","text":"The frost marshal will see them too. I can tune the seal once before we meet him."},
  {"speaker":"Rowan","text":"Protect the company, or break his defense. Tell us what you need it to do."}],
 "journal":"All three watchfires are lit. The valley answered. Merrin can tune the seal for the frost marshal.",
 "choices":[
  {"id":"ward","label":"Use the seal to shelter the company.","consequence":"Every hero starts the marshal encounter with 4 extra block. The marshal keeps his normal defense."},
  {"id":"sunder","label":"Use the seal to expose the marshal.","consequence":"Hits on the marshal gain 2 damage. The company receives no extra starting block."}]},
 {"id":"frost","chapter":1,"kind":"main","mission":3,"xp":0,"title":"The Frostbound Standard",
 "care":"Stop the marshal from closing the road the households have just found.",
 "intro":[
  {"speaker":"Marshal","text":"You lit a road into a war. Those people belonged behind their gates."},
  {"speaker":"Lysa","text":"My brother was behind yours. We brought him out."},
  {"speaker":"Rowan","text":"You have their wages. We're taking them home. Stand aside."}],
 "outro":[
  {"speaker":"Lysa","text":"He had a list of gates to close. Winterwatch is next. There are people still living there."},
  {"speaker":"Rowan","text":"The patrol at the citadel will know the approach."},
  {"speaker":"Merrin","text":"We have the ledger. A name beside every coin. Don't let the chest turn back into a number."}],
 "journal":"The marshal fell back. His orders target Winterwatch next. We carry the ledger's names with us.","choices":[]},
 {"id":"citadel","chapter":2,"kind":"quest","quest":"citadel","xp":70,"title":"The Iron Oath",
 "care":"Clear the iron patrol before it can cut off Winterwatch's households.",
 "intro":[
  {"speaker":"Rowan","text":"I trained some of that patrol. They'll know how I move."},
  {"speaker":"Lysa","text":"Then change. Watch the bombardments. We need an open road, not a perfect charge."},
  {"speaker":"Merrin","text":"Their engines mark a front before they fire. Watch the signal. Move out of the blast, and leave Lysa a clear shot."}],
 "outro":[
  {"speaker":"Lysa","text":"Winterwatch has two dozen households and one cracked wall. We can hold it until the last cart leaves."},
  {"speaker":"Rowan","text":"Or take them out now, by the lower road. The engine will burn an empty keep."},
  {"speaker":"Merrin","text":"A place can be rebuilt. So can a road. Ask them what home means before we decide what to defend."}],
 "journal":"The iron patrol is broken. Winterwatch needs a choice: hold the keep or escort its people out.",
 "choices":[
  {"id":"hold","label":"Hold Winterwatch while the households gather.","consequence":"Defend for 6 turns with 30 gate health. If we succeed, the households can return to their keep."},
  {"id":"evacuate","label":"Escort the households down the lower road.","consequence":"Defend for 4 turns with 20 gate health. Rowan must survive on the Lower gate to finish the evacuation. The keep will be lost."}]},
 {"id":"winter","chapter":2,"kind":"main","mission":4,"xp":70,"title":"Embers of Winterwatch",
 "care":"Keep the promise you made to Winterwatch's households.",
 "intro":[
  {"speaker":"Lysa","text":"Ivo sent a cart back for the children. He says not to argue about the lamp oil."},
  {"speaker":"Rowan","text":"He remembered every turn of that bridge."},
  {"speaker":"Merrin","text":"The engine is ranging the fronts. Read the next blast before you give your orders. We only have to keep our promise."}],
 "outro":[
  {"speaker":"Lysa","text":"I counted them myself. Everyone who reached our line is through."},
  {"speaker":"Rowan","text":"Then there's one thing left. Merrin's inventory puts the chest beside the Crown's command engine."},
  {"speaker":"Merrin","text":"End his orders. Bring the chest back. Let these people spend a winter on something other than surviving him."}],
 "journal":"Winterwatch's households crossed our line. The missing chest is beside the Crown's command engine.","choices":[]},
 {"id":"crown","chapter":2,"kind":"main","mission":5,"xp":0,"title":"The Hollow Crown",
 "care":"Break the command that turned the valley's wages into weapons against it.",
 "intro":[
  {"speaker":"The Crown","text":"Quartermaster. You signed for that money. You knew what an army costs."},
  {"speaker":"Rowan","text":"I knew the total. I didn't read the names. I have now."},
  {"speaker":"Lysa","text":"You can keep the crown. We're here for what you took."}],
 "outro":[
  {"speaker":"Merrin","text":"His signal is gone, but the engine keeps firing. The chest is locked at its base."},
  {"speaker":"Lysa","text":"Of course he put their pay under a weapon. Fen—find us a way through."},
  {"speaker":"Rowan","text":"This isn't finished until the chest reaches the road. Keep a way out open."}],
 "journal":"The Crown's command is broken. The engine still fires; the chest must be recovered before we can leave.","choices":[]},
 {"id":"engine","chapter":2,"kind":"quest","quest":"engine","xp":0,"title":"Break the Siege Engine",
 "care":"Collect the chest on the Causeway, clear the engine and escorts, then bring Rowan out by the High wall alive.",
 "intro":[
  {"speaker":"Merrin","text":"The chest is on the causeway. Rowan can reach it while the engine fires—but he'll need cover. Clear the captain and escorts before we leave."},
  {"speaker":"Rowan","text":"Once I have the chest, cover the High wall. It's the only bridge the engine hasn't broken."},
  {"speaker":"Lysa","text":"We're all going home. Give me a signal when you have it."}],
 "outro":[
  {"speaker":"Rowan","text":"It weighs less than I remember."},
  {"speaker":"Lysa","text":"You're not carrying the army's money anymore."},
  {"speaker":"Merrin","text":"Come on. Ivo is waiting with a ledger of his own. He'll want every coin accounted for."}],
 "journal":"The engine is silent. Rowan brought the pay chest across the High wall. The company is going home.","choices":[]}
]

static func ending_lines(decisions: Dictionary) -> Array:
 var lines=[
  {"speaker":"Ivo","text":"Every name. Every coin. I thought I'd be paying them with apologies."},
  {"speaker":"Rowan","text":"Keep the ledger. The next person who gives an order can read who pays for it."}]
 lines.append({"speaker":"Ivo","text":"We kept the steel plates from the cart. The baker is making a new door with them." if decisions.get("scout","")=="reinforce" else "The decoy lanterns are back on the ferry. Nobody has to cross the river in the dark now."})
 lines.append({"speaker":"Merrin","text":"The sheltering seal belongs at the gate now. I'll teach the households to use it." if decisions.get("beacons","")=="ward" else "I'll take the weapon tuning apart. The same lens will let us mend the mill's cracked gears."})
 lines.append({"speaker":"Lysa","text":"The families are going back to Winterwatch. We'll bring timber before the snow, not another levy." if decisions.get("citadel","")=="hold" else "Winterwatch is gone. Its people have chosen the orchard below our gate for their new homes. Ivo says we'll need more doors."})
 lines.append({"speaker":"Rowan","text":"What do we call the company now?"})
 lines.append({"speaker":"Lysa","text":"The same thing. Ours. Now help me unload."})
 return lines
