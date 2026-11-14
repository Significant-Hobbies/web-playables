# War Chest experience overhaul

Owner feedback on 2026-10-03: “The game doesn't look like a game. It looks like a shitshow. I mean what even am I doing here? I'm not even understanding.”

Lane: **overhaul**. The previously selected Company & Consequences story presentation has been rejected as a complete playable experience. Prior functional tests and native screenshots remain historical evidence; they do not establish current owner acceptance. Publication is held.

War Chest remains a native Godot local prototype for the owner, with isolated practice and persistent local campaigns. No accounts, network gameplay, analytics, payments or daily obligations. Canonical purpose contract: site-health/apps/backend/config/projects.json, war-chest: explore a tactical game with a persistent company and spatial equipment choices; judge whether real play is enjoyable. Repository scope agrees with that experimental lifecycle.

Both surfaces exist: scenes/pocket.tscn / scripts/pocket_main.gd are the native game; site/index.html is a deployed teaser. The old standalone declaration in DESIGN.md is contradicted by the teaser. Selected implementation must correct it, use one system across the pair, and preserve remote landing provenance changes. No public game download or commercial release is approved.

## Evidence and failure

The current battle fixture presents the fictional family evacuation as three fronts, five enemies and a command tray, without visible carts or civilians. The model wins after four enemy phases while gate and company survive; it does not track twelve carts. The story's human purpose lacks visible gameplay evidence.

The first battle exposes five Rowan actions, three companions, six shared orders, card choice and target choice at once. Hovered detail displaces the coach body. Cleave deals 8 to each 10-HP foe; the first strike can feel inconsequential. The actual first reward, Storm rune, raises a linked weapon command by 2, but its payoff arrives after battle, aftermath, road/briefing and packing.

Three-agent review confirmed: Rowan26/Lysa20/Fen22 HP; gate30; six shared orders. Five10-HP Bone guards on fronts2/1/2 each attack3, totals6/3/6. Shield gives8block for one order. Cleave hits every foe on Rowan's front for8 at cost2. Four enemy phases with waves2/4. Base reward85gold, optional intact-gate bonus20, 70XP -> level2, free unpacked Storm rune. Level2 adds2 starting maximum HP to companions. The Gate does not recruit Merrin or grant Dawn aegis.

## Quality bar and references

Within seconds communicate whom to protect, how long, which companion acts, the visible threat and the result of an order. Show orders spent, enemy resolution, rescue progress and the reward-to-next-battle link. Camp characters must eventually rest and respond rather than remain frozen in attack poses.

Primary references accessed 2026-10-03:

- Matthew Davis, Into the Breach Design Postmortem: https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf. Transfer its explicit readability/limited-menu/telegraphed-threat constraints, not assets or complete rules. Text inspected; PDF image delivery unavailable.
- Stoic, The Banner Saga: https://stoicstudio.com/banner-saga/the-banner-saga. Transfer continuity between the company, travel, conversation and combat consequence; do not copy its Viking branding, art or music. Product text inspected; remote image fetch failed.

Anti-reference: current War Chest first battle. Repeated command cards dominate the backdrop while the human goal is invisible. More helper paragraphs or restyling that tray cannot solve this.

## Comparison contract

Every option shows Lantern Gate, Rowan/Lysa/Fen, incoming threat and Shield response. Camp shows the Gate aftermath, level2, missing Ivo and actual Storm rune packing. A proposes fewer enemies in the first lesson; B/C show the existing five. Each has a paired truthful teaser layout without a false download CTA.

| Direction | System and interaction | Tradeoff |
| --- | --- | --- |
| A — The Last Crossing | Elevated world diorama, visible family road/open gate, sparse corner HUD, selected actor and nearby commands. Gold actions, rust threat; Georgia story, Avenir commands, Menlo metadata. Shared world camp and physical chest. | Strongest purpose-to-action connection. Phased civilian motion, contextual controls and reduced first beat require implementation. Two foes are proposed teaching, not current balance. |
| B — The Captain's Table | Carved top-down terrain board, company counters, every attack arrow and one order docket. Exact shared-order economy. Parchment/wood/navy/rust; serif character and monospaced facts. Same table opens the chest and previews Cleave8 ->10. | Clearest planning, smallest rules change. More abstraction may weaken emotional connection. Map positions are cosmetic existing fronts, not free-grid movement. |
| C — The Company Road | Side-view wall and civilian procession, close companion selector, two-action teaching and short character lines. Wide world stage and quiet paper narration; Georgia/Avenir. Fireside camp keeps company and chest together. | Strong character readability and story pacing. Less spatial freedom. Reduced actions require a temporary tutorial restriction and later disclosure. |

Recommendation: A with exact threat/result previews near the selected actor. The selection establishes camera, composition and interaction; these static figures are not final commercial art.

## Gates

1. Inspect three directions, camp states and paired teaser layouts; record scan limitations.
2. Explicit owner selection. No production UI implementation before the answer.
3. Complete the chosen contract, record the exact owner quote, correct DESIGN.md surface declarations and run preflight with .fleet/design-review-game-experience-2026-10-03.json.
4. Build visible goal -> selection -> preview -> order -> resolution -> rescue -> reward. Preserve independent model rules and compatible saves. Teach recruitment/levels at actual story milestones.
5. Scoped model/UI checks, then inspect a fresh practice build and measured native windows at1152 and two larger widths. Review all12 story encounters and paired teaser.
6. Run receipt check, obtain real play feedback, then return to authorized commit/push closure. Tests cannot establish enjoyment or commercial readiness.

## Preview limitations

CUA inspection returned “Computer Use was not approved to use Godot.” Native renderer process was denied. Chromium bootstrap_check_in failed with permission denied. Localhost server binding failed Operation not permitted. Permission policy forbids escalation.

Safe fallback: headless Godot records original probe drawing instructions without loading a game/save; Pillow composes static UI storyboards with existing sprites and installed fonts. These are **not native/browser screenshots or playable builds**. Compact1152 boards are scaled from1440, not responsive evidence. Teaser1280x1150 boards illustrate the HTML hierarchy, not browser layout.

Failed pinned scanner outputs remain under ignored .fleet-local/slop/game-experience-2026-10-03/. Scores unknown. Headless capture also reports macOS certificate-store access denied; no certificate/network functionality is used.

No production UI/model/save/landing changed in this comparison. Probes are isolated under tests/game_experience_directions/ and outside the pack closure. Remove comparison code after selected implementation, preserving evidence. No commit, push or release performed.
