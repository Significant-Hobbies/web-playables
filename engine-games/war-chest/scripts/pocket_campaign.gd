class_name PocketCampaign
extends "res://scripts/siege_game.gd"
## Additive campaign layer. Version-2 saves without these fields remain valid.
const BANNERS={
 "ember":{"name":"Ember Company","icon":"cleave","effect":"Strike and Cleave deal +%d damage."},
 "hunt":{"name":"Farstrider","icon":"volley","effect":"Volley and Bolt deal +%d damage."},
 "stone":{"name":"Stoneguard","icon":"ward","effect":"Every ally starts each turn with %d block."},
 "life":{"name":"Field Healers","icon":"mend","effect":"Heal restores +%d health (Merrin + flask)."},
 "storm":{"name":"Stormcallers","icon":"spark","effect":"Storm, Freeze and Pin deal +%d damage."},
 "fortune":{"name":"Golden Standard","icon":"chest","effect":"Victories award +%d gold."}
}
const CONTRACTS={
 "raid":{"name":"Supply Raid","kind":"ASSAULT","rounds":0,"extra":0,"desc":"Ranged raiders hunt your weakest ally. Defeat the patrol."},
 "siege":{"name":"Powder & Steel","kind":"DEFENSE","rounds":4,"extra":15,"desc":"Sappers attack the gate directly. Hold through their waves."},
 "elite":{"name":"Ironclad Patrol","kind":"ASSAULT","rounds":0,"extra":30,"desc":"Armored guards block 2 per hit. Their captain enrages at half health."}
}

func new_campaign():
 super()
 campaign.war=war_defaults()

func war_defaults() -> Dictionary:
 return {"renown":0,"contracts":0,"banners":{},"equipped":""}

func war() -> Dictionary:
 return campaign.war

func max_tier() -> int:
 return mini(5,1+int(war().renown/6))

func banner_rank(id: String) -> int:
 return int(war().banners.get(id,0)) if war().equipped==id else 0

func banner_text(id: String,rank: int) -> String:
 var value=rank*({"stone":2,"life":2,"fortune":10}.get(id,1))
 return BANNERS[id].effect % value

func equip_banner(id: String) -> bool:
 if not battle.is_empty(): return fail("Change banners at the keep, between battles.")
 if id!="" and not war().banners.has(id): return fail("Win a battle and claim this banner first.")
 war().equipped=id
 message="No banner equipped." if id=="" else BANNERS[id].name+" raised. "+banner_text(id,war().banners[id])
 return true

func begin(index: int) -> bool:
 if not super.begin(index): return false
 battle.war_rules=true
 battle.loot=[];battle.loot_claimed=false
 battle.commands=6+(1 if level()>=5 else 0)
 for e in battle.enemies: decorate_enemy(e)
 apply_start_block()
 plan()
 return true

func contract_info(id: String,tier: int) -> Dictionary:
 if not CONTRACTS.has(id): return {}
 var info=CONTRACTS[id].duplicate()
 info.gold=75+tier*35+info.extra
 info.rounds+=1 if tier>=4 and info.kind=="DEFENSE" else 0
 info.name+=" · Tier %d" % tier
 return info

func begin_contract(id: String,tier: int) -> bool:
 if not battle.is_empty(): return fail("Finish the current battle before taking a contract.")
 if level()<2: return fail("Win your first campaign battle to unlock contracts.")
 if not CONTRACTS.has(id) or tier<1 or tier>max_tier(): return fail("Choose an unlocked contract tier.")
 if not begin(0): return false
 battle.contract={"id":id,"tier":tier,"rotation":int(war().contracts)%3}
 battle.mission=mini(5,level()-1)
 battle.enemies=[];battle.serial=0
 for lane in range(3):
  spawn(lane,false)
  if id!="siege" or tier>=3: spawn(lane,id=="elite" and lane==1)
 plan()
 message=encounter().desc
 return true

func encounter() -> Dictionary:
 if battle.has("contract"): return contract_info(battle.contract.id,battle.contract.tier)
 return super.encounter()

func spawn(lane: int,boss: bool):
 var previous=int(battle.serial)
 super.spawn(lane,boss)
 if int(battle.serial)>previous and battle.get("war_rules",false): decorate_enemy(battle.enemies.back())

func decorate_enemy(e: Dictionary):
 var role="soldier"
 if battle.has("contract"):
  var c=battle.contract
  var special_lane=posmod(int(c.rotation)+int(battle.round)-1,3)
  match c.id:
   "raid": role="archer" if e.lane==special_lane else "soldier"
   "siege":
    role="armored"
    if e.lane==special_lane:
     var already=false
     for other in battle.enemies:
      if other.id!=e.id and other.hp>0 and other.lane==e.lane and other.get("trait","")=="sapper": already=true
     if not already: role="sapper"
   "elite": role="armored"
  var extra=(int(c.tier)-1)*4
  e.hp+=extra;e.max_hp+=extra;e.power+=int((int(c.tier)-1)/2)
 elif int(battle.mission)>0:
  if e.lane==1: role="armored"
  elif int(battle.mission)>=2 and e.lane==2: role="sapper"
  elif e.lane==0: role="archer"
 e.trait="captain" if e.boss else role
 if not e.boss: e.name={"soldier":"Bone guard","archer":"Ash archer","armored":"Iron guard","sapper":"Gate sapper"}[role]
 if e.trait=="sapper": e.power=maxi(2,int(e.power)-1)

func enemy_detail(e: Dictionary) -> String:
 return {"soldier":"Attacks the first ally on its front.","armored":"Blocks 2 damage from each hit (minimum 1 gets through).","archer":"Targets the weakest living ally across all fronts.","sapper":"Bypasses your troops and attacks the gate. Kill or stun it.","captain":"Enrages at half health: +2 attack."}.get(e.get("trait","soldier"),"")

func plan():
 super()
 for e in battle.get("enemies",[]):
  if e.get("trait","")=="sapper": e.target="gate"
  elif e.get("trait","")=="archer":
   var weakest={}
   for h in battle.heroes:
    if h.hp>0 and (weakest.is_empty() or h.hp<weakest.hp): weakest=h
   e.target="gate" if weakest.is_empty() else weakest.id

func attack_power(e: Dictionary) -> int:
 return super.attack_power(e)+(2 if e.get("trait","")=="captain" and e.hp*2<=e.max_hp else 0)

func hurt_foe(e: Dictionary,amount: int):
 super.hurt_foe(e,maxi(1,amount-2) if e.get("trait","")=="armored" else amount)

func damage_for(actor: String,card: String) -> int:
 var value=super.damage_for(actor,card)
 if card in ["strike","cleave"]: value+=banner_rank("ember")
 if card in ["volley","bolt"]: value+=banner_rank("hunt")
 if card in ["spark","frost","pin"]: value+=banner_rank("storm")
 if card=="mend": value+=banner_rank("life")*2
 return value

func card_text(actor: String,card: String) -> String:
 if card=="ward": return "Give an ally %d block until this turn ends." % (8+int(campaign.items.get("ward",0))*2)
 return super.card_text(actor,card).replace(" damage"," base damage (before armor)")

func apply_start_block():
 if not battle.get("war_rules",false): return
 for h in battle.heroes:
  if h.hp>0: h.shield+=banner_rank("stone")*2

func resolve() -> bool:
 if battle.is_empty(): return false
 var previous=battle.round
 var result=super.resolve()
 if battle.phase=="playing" and battle.round!=previous: apply_start_block()
 return result

func settle(won: bool):
 if battle.rewarded: return
 settle_encounter(won)
 if won:
  var bonus=banner_rank("fortune")*10
  campaign.gold+=bonus;battle.reward+=bonus
  var victories=int(war().contracts)
  for wins in campaign.wins: victories+=int(wins)
  var ids=BANNERS.keys();var offers=[]
  for i in range(3): offers.append(ids[posmod(victories-1+i*2,ids.size())])
  battle.loot=offers;battle.loot_claimed=false

func settle_encounter(won: bool):
 if not battle.has("contract"): super.settle(won)
 else:
  battle.phase="victory" if won else "defeat";battle.rewarded=true
  if won:
   var before=level()
   battle.reward=encounter().gold;campaign.gold+=battle.reward
   campaign.xp=mini(350,int(campaign.xp)+35)
   war().contracts+=1;war().renown+=int(battle.contract.tier)
   battle.new_level=level() if level()>before else 0
   if before<4 and level()>=4: campaign.items.frost=0
   log_event("Contract complete · +%d renown" % battle.contract.tier)

func has_loot() -> bool:
 return not battle.is_empty() and not battle.get("loot",[]).is_empty() and not battle.get("loot_claimed",false)

func claim_banner(id: String) -> bool:
 if not has_loot() or id not in battle.loot: return fail("Choose one of this victory's banner rewards.")
 var old=int(war().banners.get(id,0))
 if old<3:
  war().banners[id]=old+1
  if war().equipped=="": war().equipped=id
  message="%s reaches rank %d. Change your active banner at the keep." % [BANNERS[id].name,old+1]
 else:
  campaign.gold+=40;message=BANNERS[id].name+" is mastered. Received 40 gold instead."
 battle.loot_claimed=true
 battle.claim_message=message
 return true

func return_to_camp() -> bool:
 if has_loot():
  return fail("Choose your victory banner before returning to the keep.")
 return super()

func restore(data) -> bool:
 if not super.restore(data): return false
 if not campaign.has("war"): campaign.war=war_defaults()
 return true

func validate_save(data) -> String:
 var error=super.validate_save(data)
 if error!="": return error
 var w=data.campaign.get("war",war_defaults())
 if not w is Dictionary: return "Invalid warband progression."
 for key in ["renown","contracts"]:
  if not integer_in(w.get(key),0,1000000): return "Invalid contract progress."
 if not w.get("banners") is Dictionary or not w.get("equipped") is String: return "Invalid banners."
 for id in w.banners:
  if not BANNERS.has(id) or not integer_in(w.banners[id],1,3): return "Invalid banner rank."
 if w.equipped!="" and not w.banners.has(w.equipped): return "Active banner is not owned."
 var b=data.battle
 if b.is_empty(): return ""
 if b.has("war_rules") and not b.war_rules is bool: return "Invalid combat rules."
 if b.has("claim_message") and (not b.claim_message is String or b.claim_message.length()>240): return "Invalid reward message."
 if b.has("contract"):
  var c=b.contract
  if not c is Dictionary or not CONTRACTS.has(c.get("id")) or not integer_in(c.get("tier"),1,5) or not integer_in(c.get("rotation"),0,2): return "Invalid contract."
 if b.has("loot"):
  if not b.loot is Array or b.loot.size() not in [0,3] or not b.get("loot_claimed") is bool: return "Invalid victory rewards."
  var seen=[]
  for id in b.loot:
   if not BANNERS.has(id) or id in seen: return "Invalid banner choice."
   seen.append(id)
  if not b.loot.is_empty() and b.phase!="victory": return "Banner rewards require a victory."
 for e in b.enemies:
  if e.get("trait","soldier") not in ["soldier","armored","archer","sapper","captain"]: return "Invalid enemy trait."
 return ""
