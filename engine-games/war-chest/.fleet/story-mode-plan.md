# Story mode implementation plan — October 2, 2026

Owner: “Okay build it out. Go through the story. It should be a story mode game.” Guiding standard: “Games are simple: first you have to make them care, then you have to make them pay.” The commercial discussion is a quality bar, not permission to add payments or release the personal game.

## Product plan

Keep Godot, the working deterministic game, Banner & Steel art, and all legacy saves. Add an optional authored story layer for genuinely new campaigns. Existing player progress is never reset or silently enrolled. Separate story data/rules from rendering. Keep battle loss recoverable: wounded companions withdraw; no invented permanent-death system.

Presentation integration must use a separate local story save slot. A saved original company gets an explicit entry to a new story company, with the original still available from the menu. Resume a story through normal restore; enrollment is only for a newly instantiated model. Bare `--pocket-demo` and `--banner-opening` keep their existing isolated regression behavior; a dedicated story-practice flag starts the new scenes without reading or writing player files.

Premise: stranded families arrive at Lantern Gate without the winter pay promised to them. Rowan once obeyed the order that shut them out. Lysa's brother Ivo is among the missing. A recovered rune leads to an army using the withheld wages to fund siege engines. The company must recover the chest and make room for the people whose names are written inside it. Human responsibility drives the plot; exposition follows action.

Three chapters, four encounters each:

1. **The Gate We Opened:** Lantern Gate → Ashen Line → Missing Scout → Supply Cart.
2. **Names in the Ledger:** Bell Tower → Sunken Reliquary → Watchfires → Frostbound Standard.
3. **What We Keep:** Iron Oath → Winterwatch → Hollow Crown → Siege Engine/extraction → epilogue.

Levels advance at Gate, Convoy, Watchfires, Iron Oath and Winterwatch (70 XP each; other story first clears 0 XP). Actual skills/equipment remain the six existing levels. Story-only leveling avoids reaching the cap halfway through the route while preserving the inherited mission eligibility. Rewards/mastery continue through later encounters.

Three persistent choices must alter later battle state and receive later narrative acknowledgment:

- After rescuing Ivo: reinforce the cart (more durability) or create a decoy (a safer enemy formation).
- After lighting the watchfires: use Merrin's rune knowledge to protect the company (initial block) or expose the marshal (documented boss-damage benefit).
- After the Iron Oath: hold Winterwatch (longer defense) or evacuate it (shorter defense, less gate health, mandatory escort positioning). The final home differs accordingly.

Mandatory rescue/convoy/watchfire objectives require movement. Story Reliquary requires carrying the recovered seal out, so passive Stoneguard cannot auto-finish it. The final engine encounter remains active after killing enemies until Rowan collects the chest at the Causeway and extracts it to the High wall, surviving the relevant turns. Both paths must be earned and winnable without grinding; do not manufacture guard quotas to make command counts look tactical.

## Design lane and gates

**Overhaul** for the new dialogue, story route and preparation flow. Preserve the adult flat art/palette while presenting three materially different polished systems, each with a dialogue/choice scene and a campaign/preparation context. Native previews may precede approval. Production UI waits for explicit owner selection and passing v2 preflight. Use `.fleet/design-review-story-mode.json` consistently for create/preflight/check, retaining previous receipts.

Native slop-scale exemption: this is Godot Control rendering, with no DOM/CSS/browser URL; the pinned web scanner cannot inspect it. Record `evidence.slopScale.platform: native` and the reason rather than inventing scores. Native supported sizes are 1152×720+, with wide/tall aspect preservation. Inspect actual rendering/input; keep the shared checker’s platform limitations explicit.

## Implementation ownership

- Root: canonical narrative data (`scripts/story_data.gd`), story/product plan, approved UI integration and native play.
- Rules agent: additive `scripts/story_game.gd` and focused save/state/objective regressions; minimal backward-compatible Journey hooks if required.
- Reliability agent: independent earned story route/branch proof, legacy next-turn comparison and eventual fresh packaged artifacts.
- Presentation agent: three native direction prototypes and independent rendered review. No production UI implementation before selection.

## Acceptance

Validate new-story enrollment versus pristine restored legacy state; route/scene persistence; atomic invalid choices; no repeated choice/reward/progress; battle undo/save round trips; defeat/retry; off-route prevention; all three decisions' real effects; both earned branches; six paced unlock levels; no-movement failures with clear objectives; Reliquary extraction; engine extraction before epilogue; full ending with recalled choices. Preserve malformed-save bytes and isolated storage. Run focused model checks before the existing full check. Native review and owner enjoyment remain separate from solver success.

No commit, push, release, payments, network, analytics, production dependency or owner-save access.
