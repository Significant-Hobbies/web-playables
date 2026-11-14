extends "res://scripts/journey_game.gd"
## Optional opening for genuinely new campaigns. Legacy state is never enrolled.
## 0: defend; 1: pack earned rune; 2: see its payoff; 3: company opened up.
func enroll_opening() -> bool:
 if save_locked or not battle.is_empty() or campaign.xp!=0 or campaign.has("opening"): return false
 for count in campaign.wins:
  if count!=0: return false
 campaign.opening={"stage":0,"skipped":false,"rune_used":false}
 campaign.items.erase("cube");campaign.placements.erase("cube")
 return true

func opening_stage() -> int:
 return int(campaign.get("opening",{}).get("stage",3))

func opening_guided() -> bool:
 return campaign.has("opening") and opening_stage()<3 and not campaign.opening.skipped

func skip_opening():
 if campaign.has("opening"): campaign.opening.skipped=true

func place(id: String,x: int,y: int,rotation: int) -> bool:
 if not super.place(id,x,y,rotation): return false
 if opening_stage()==1 and (empowered("blade") or empowered("bow")):
  campaign.opening.stage=2
  message="Rune linked. Packed weapons touching it gain +2 command damage. Try it against the Ashen Line."
 return true

func settle(won: bool):
 if battle.rewarded: return
 var first=campaign.has("opening") and opening_stage()==0 and battle.mission==0 and not battle.has("quest") and not battle.has("contract")
 super.settle(won)
 if not won: return
 if first:
  campaign.items.cube=0;campaign.opening.stage=1
  # The first reward teaches gear. Banner choices begin with later victories.
  battle.loot=[];battle.loot_claimed=false
  message="The gate holds. A storm rune recovered from the raiders is yours."
 elif campaign.has("opening") and battle.mission==1 and not battle.has("quest") and not battle.has("contract"):
  campaign.opening.stage=3

func play(actor: String,card: String,target_id: String) -> bool:
 var linked=COMMANDS.has(card) and COMMANDS[card].gear in ["blade","bow"] and empowered(COMMANDS[card].gear)
 if not super.play(actor,card,target_id): return false
 if campaign.has("opening") and opening_stage()>=1 and linked:
  campaign.opening.rune_used=true
 return true

func validate_save(data) -> String:
 var error=super.validate_save(data)
 if error!="": return error
 if not data.campaign.has("opening"): return ""
 var o=data.campaign.opening
 if not o is Dictionary or not integer_in(o.get("stage"),0,3) or not o.get("skipped") is bool or not o.get("rune_used") is bool:
  return "Invalid opening progress."
 if o.stage>=1 and (data.campaign.wins[0]<1 or not data.campaign.items.has("cube")):
  return "Opening reward requires the first victory and its rune."
 return ""
