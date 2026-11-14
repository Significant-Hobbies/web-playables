extends "res://tests/game_experience_directions/base.gd"
## Direction C: an intimate, side-view company journey.
## Static proposal only. No model, inputs, save access, or actual civilian progress.

func render(state: String):
 context = state
 _company()
 if context == "camp":
  _camp_labels()
 else:
  _battle_labels()
 queue_redraw()

func _company():
 box(Rect2(0, 0, 224, 868), INK)
 label("C / COMPANY ROAD", Rect2(24, 27, 190, 30), 13, GOLD, "mono")
 label("Your three", Rect2(24, 72, 185, 49), 29, PAPER, "serif")
 label("companions", Rect2(24, 110, 185, 39), 23, PAPER, "serif")
 label("Choose who acts.", Rect2(24, 154, 180, 26), 15, Color("a8bdb2"))
 box(Rect2(14, 194, 196, 193), Color("304742"), GOLD, 2)
 actor("rowan", Rect2(36, 206, 103, 123))
 label("1", Rect2(174, 209, 25, 26), 17, GOLD, "mono")
 label("Rowan", Rect2(28, 326, 164, 34), 24, PAPER, "serif")
 label("Shield & sword", Rect2(28, 360, 170, 24), 14, Color("c9d2c1"))
 actor("lysa", Rect2(35, 411, 106, 128))
 label("2", Rect2(174, 416, 25, 26), 17, Color("a8bdb2"), "mono")
 label("Lysa", Rect2(28, 543, 163, 35), 24, PAPER, "serif")
 label("Archer · any front", Rect2(28, 578, 175, 26), 14, Color("a8bdb2"))
 actor("fen", Rect2(25, 641, 156, 117))
 label("3", Rect2(174, 637, 25, 26), 17, Color("a8bdb2"), "mono")
 label("Fen", Rect2(28, 763, 163, 35), 24, PAPER, "serif")
 label("The one who stays", Rect2(28, 798, 178, 26), 14, Color("a8bdb2"))

func _battle_labels():
 label("CHAPTER I  /  THE LANTERN GATE", Rect2(262, 27, 790, 27), 13, INK, "mono")
 label("Keep the road open.", Rect2(260, 64, 720, 61), 42, INK, "serif")
 label("Hold four turns. Keep the gate and your company alive.", Rect2(263, 124, 790, 32), 19, INK)
 box(Rect2(1110, 27, 298, 122), Color("e8dfc6"), Color("938e71"), 1)
 label("TURN 1 OF 4", Rect2(1128, 39, 240, 27), 17, INK, "mono")
 label("Gate 30 / 30", Rect2(1128, 72, 240, 32), 25, INK, "serif")
 label("6 orders shared by everyone", Rect2(1128, 112, 265, 26), 15, INK)
 label("Families on the road", Rect2(725, 214, 297, 28), 16, Color("354a40"))
 label("HIGH WALL", Rect2(274, 560, 334, 25), 14, Color("d7cdb3"), "mono")
 label("CAUSEWAY", Rect2(722, 560, 281, 25), 14, Color("d7cdb3"), "mono")
 label("LOWER GATE", Rect2(1083, 560, 290, 25), 14, Color("d7cdb3"), "mono")
 actor("rowan", Rect2(305, 335, 142, 180))
 actor("skeleton", Rect2(469, 369, 93, 142))
 actor("skeleton", Rect2(574, 369, 93, 142))
 actor("lysa", Rect2(723, 341, 127, 173))
 actor("skeleton", Rect2(909, 370, 94, 141))
 actor("fen", Rect2(1056, 419, 130, 96))
 actor("skeleton", Rect2(1204, 375, 88, 139))
 actor("skeleton", Rect2(1310, 375, 88, 139))
 label("Rowan · 26 HP", Rect2(293, 522, 180, 30), 17, PAPER)
 label("Lysa · 20 HP", Rect2(720, 522, 188, 30), 17, PAPER)
 label("Fen · 22 HP", Rect2(1062, 522, 172, 30), 17, PAPER)
 for x in [473, 578, 913, 1203, 1309]:
  label("10 HP", Rect2(x, 332, 93, 27), 14, INK, "mono")
 label("6 incoming", Rect2(393, 308, 175, 28), 17, RUST)
 label("3 incoming", Rect2(821, 308, 175, 28), 17, RUST)
 label("6 incoming", Rect2(1178, 308, 175, 28), 17, RUST)
 box(Rect2(224, 609, 1216, 259), Color("eee5ce"))
 label("LYSA", Rect2(267, 636, 339, 25), 13, Color("69735b"), "mono")
 label("“Keep them off Rowan.\nThe families are still coming.”", Rect2(264, 672, 387, 113), 25, INK, "serif")
 label("Rowan is selected. Choose his order.", Rect2(697, 639, 680, 31), 19, INK)
 button("Shield · 1 order", Rect2(697, 687, 327, 65), true)
 button("Cleave · 2 orders", Rect2(1047, 687, 337, 65))
 label("Give any ally 8 block.\nChoose Rowan to absorb the 6 incoming.", Rect2(701, 766, 317, 67), 17, INK)
 label("Deal 8 to both foes on Rowan’s front.\nEach would have 2 HP left.", Rect2(1051, 766, 329, 67), 17, INK)
 footer("ISOLATED PROPOSAL · Two-action first-turn lesson is a proposed restriction. Current Gate: 6 orders, 4 turns. No gameplay or save changes.")

func _camp_labels():
 label("CHAPTER I  /  THE FIRE AFTER", Rect2(262, 27, 790, 27), 13, Color("c6b99d"), "mono")
 label("The gate held.", Rect2(260, 64, 800, 65), 46, PAPER, "serif")
 label("Company level 2 · Every hero gains 2 maximum HP", Rect2(263, 130, 824, 32), 20, Color("d7c5a0"))
 label("85 gold + 20 for an intact gate", Rect2(1060, 40, 341, 29), 17, GOLD)
 label("STORM RUNE FOUND", Rect2(1060, 83, 337, 27), 14, GOLD, "mono")
 actor("rowan", Rect2(323, 360, 151, 208))
 actor("lysa", Rect2(643, 363, 151, 209))
 actor("fen", Rect2(797, 478, 169, 117))
 label("LYSA", Rect2(272, 220, 674, 29), 13, GOLD, "mono")
 label("“Fit it to a weapon.\nThen help me find my brother.”", Rect2(268, 256, 668, 99), 29, PAPER, "serif")
 label("PACKING PREVIEW", Rect2(1004, 248, 399, 26), 13, Color("d7c5a0"), "mono")
 label("A small rune. A stronger answer.", Rect2(1001, 285, 393, 37), 21, PAPER, "serif")
 glyph("rune", Rect2(1061, 386, 35, 35), GOLD)
 label("Storm beside Emberblade", Rect2(1001, 617, 408, 31), 20, PAPER)
 label("Cleave: 8 → 10 damage", Rect2(1001, 655, 408, 36), 24, GOLD, "serif")
 label("Place the one-cell rune beside the weapon\nto empower its linked card.", Rect2(1001, 699, 405, 63), 17, Color("d7c5a0"))
 box(Rect2(224, 786, 1216, 82), Color("192d2a"))
 label("The next fight has foes with 10 HP.\nYou can make the first Cleave count.", Rect2(269, 802, 708, 58), 19, PAPER)
 button("Pack the Storm rune", Rect2(1012, 800, 390, 55), true)
 footer("ISOLATED PROPOSAL · Real Gate rewards shown; the linked rune arrangement is a packing preview. No gameplay, input or save integration.")

func _draw():
 if context == "camp":
  _camp_world()
 else:
  _battle_world()

func _battle_world():
 paint_rect(Rect2(0, 0, 1440, 900), Color("d6cfb6"))
 paint_rect(Rect2(224, 166, 1216, 443), Color("bdc4aa"))
 paint_circle(Vector2(1278, 216), 39, Color("e9ddae"))
 poly([Vector2(224, 337), Vector2(400, 271), Vector2(590, 306), Vector2(818, 260), Vector2(1090, 305), Vector2(1440, 238), Vector2(1440, 609), Vector2(224, 609)], Color("7f9582"))
 for i in range(18):
  tree(Vector2(251 + i * 72, 402), 0.7 + (i % 3) * 0.13, Color("5c7968"))
 # The civilian path is separate from the parapet where the company fights.
 paint_rect(Rect2(224, 269, 1216, 35), Color("a59e7a"))
 paint_line(Vector2(260, 304), Vector2(1430, 304), Color("777754"), 3)
 for i in range(9):
  var hues = [Color("897053"), Color("688078"), Color("b09b6c")]
  civilian(Vector2(645 + i * 73, 291), hues[i % 3], 0.9)
 cart(Vector2(1034, 289), 0.78)
 cart(Vector2(1328, 289), 0.78)
 arrow(Vector2(578, 282), Vector2(492, 282), Color("64745c"), 2)
 # Side-on masonry makes three fronts a connected place.
 paint_rect(Rect2(224, 472, 1216, 137), Color("59665e"))
 paint_rect(Rect2(224, 475, 1216, 23), Color("aaac91"))
 paint_rect(Rect2(224, 499, 1216, 6), Color("314b44"))
 for y in [515, 546, 578]:
  for x in range(238 + (16 if y == 546 else 0), 1450, 56):
   paint_rect(Rect2(x, y, 48, 23), Color("69756a"), false, 1)
 for x in range(245, 1440, 83):
  paint_rect(Rect2(x, 465, 29, 17), Color("9fa48c"))
 paint_line(Vector2(688, 340), Vector2(688, 548), Color("74816c"), 1)
 paint_line(Vector2(1038, 340), Vector2(1038, 548), Color("74816c"), 1)
 paint_circle(Vector2(260, 352), 71, Color("687768"))
 paint_rect(Rect2(224, 352, 107, 121), Color("687768"))
 paint_circle(Vector2(255, 356), 48, Color("243e37"))
 paint_rect(Rect2(224, 356, 78, 118), Color("243e37"))
 paint_rect(Rect2(238, 423, 49, 52), Color("957550"))
 for x in [240, 253, 266, 279]:
  paint_line(Vector2(x, 423), Vector2(x, 475), Color("5d4e3a"), 2)
 paint_line(Vector2(255, 323), Vector2(255, 402), Color("b79b67"), 3)
 paint_circle(Vector2(255, 337), 8, GOLD)
 # Intent arrows are the next enemy response, not completed damage.
 arrow(Vector2(517, 385), Vector2(426, 394), RUST, 2)
 arrow(Vector2(621, 385), Vector2(436, 409), RUST, 2)
 arrow(Vector2(950, 386), Vector2(835, 398), RUST, 2)
 arrow(Vector2(1244, 396), Vector2(1170, 455), RUST, 2)
 arrow(Vector2(1350, 396), Vector2(1177, 468), RUST, 2)
 paint_arc(Vector2(376, 469), 82, 0.0, PI, 30, GOLD, 3, true)

func _camp_world():
 paint_rect(Rect2(0, 0, 1440, 900), Color("2a3a32"))
 paint_rect(Rect2(224, 180, 1216, 606), Color("374539"))
 poly([Vector2(224, 211), Vector2(673, 158), Vector2(1440, 228), Vector2(1440, 261), Vector2(672, 204), Vector2(224, 250)], Color("172c29"))
 for x in [249, 493, 740, 993, 1411]:
  paint_line(Vector2(x, 196), Vector2(x, 767), Color("24362d"), 21)
 paint_rect(Rect2(280, 383, 103, 118), Color("1e342f"))
 paint_rect(Rect2(295, 396, 73, 85), Color("829580"))
 paint_line(Vector2(331, 396), Vector2(331, 481), Color("364b3e"), 7)
 paint_line(Vector2(295, 434), Vector2(368, 434), Color("364b3e"), 7)
 paint_rect(Rect2(224, 577, 1216, 209), Color("4a4936"))
 for y in [611, 649, 687, 725, 763]:
  paint_line(Vector2(224, y), Vector2(1440, y), Color("59543d"), 2)
 paint_rect(Rect2(306, 548, 191, 25), Color("745b40"))
 paint_rect(Rect2(661, 550, 164, 25), Color("745b40"))
 for x in [323, 473, 677, 808]:
  paint_rect(Rect2(x, 570, 11, 43), Color("303c2c"))
 paint_circle(Vector2(556, 587), 81, Color("524b31"))
 paint_circle(Vector2(556, 587), 55, Color("705234"))
 for i in range(8):
  var angle = TAU * i / 8.0
  paint_circle(Vector2(556, 602) + Vector2(cos(angle) * 46, sin(angle) * 16), 11, Color("7e7d66"))
 paint_line(Vector2(524, 603), Vector2(588, 588), Color("5a3528"), 13)
 paint_line(Vector2(529, 585), Vector2(584, 606), Color("5a3528"), 13)
 poly([Vector2(533, 590), Vector2(537, 558), Vector2(553, 571), Vector2(559, 528), Vector2(581, 589)], RUST)
 poly([Vector2(545, 592), Vector2(554, 563), Vector2(560, 577), Vector2(570, 552), Vector2(575, 591)], GOLD)
 paint_line(Vector2(554, 510), Vector2(547, 490), Color("7b8067"), 3)
 paint_line(Vector2(547, 483), Vector2(554, 464), Color("7b8067"), 3)
 # Root's helper is the real chest footprint with a proposed linked placement.
 camp_chest(Vector2(1016, 341), 48)
 arrow(Vector2(1083, 365), Vector2(1056, 365), GOLD, 3)
