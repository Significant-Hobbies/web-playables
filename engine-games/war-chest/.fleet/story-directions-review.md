# Story direction comparison — 2026-10-02

Reviewer: `presentation_review`; native prototype author and direct rendered reviewer. This is an authored direction comparison, not an independent production-quality certification or owner acceptance.

Lane: **overhaul** for the new narrative scene, campaign navigation and preparation context. Banner & Steel's existing adult flat illustration, native Godot runtime and semantic colors remain authoritative. Production integration waits for the owner's explicit direction selection and the root agent's implementation preflight. Receipt: `.fleet/design-review-story-mode.json`.

## Constant evaluation brief

War Chest helps a strategy-game lover grow an enduring warband through an authored story, tactical battles and spatial equipment choices. The immediate screen job is to hear whom the company is helping, decide how to get Ivo's cart through, then prepare for the next encounter. The surface is native desktop single-player; there is no commerce, account, analytics or network integration.

All three options use the same current `scripts/story_data.gd` scene: the Scout rescue outro, Ivo's account, and the two canonical convoy choices. His dialogue and both branch labels/consequences are read directly from `Story.NODES[2]`. Ivo has no existing portrait, so he remains a named textual speaker. Rowan and Lysa come from the existing company atlas. The second context is **The Last Supply Cart, encounter 04/12**, with the actual three chapter names: The Gate We Opened; Names in the Ledger; What We Keep. These are preview compositions; choosing a branch changes only preview feedback and saves no progress.

The consequences remain explicit and identical: reinforcement gives 30 gate health; decoy gives 25 gate health and draws an enemy away from the first escort front. Neither branch is visually endorsed before selection. The existing Lantern Gate illustration supplies the shared world treatment; the probes do not claim to add a new camp, cart or NPC asset.

Reference principles are retained from the root agent's [story reference brief](story-reference-brief.md): responsibility carried along a company road, a concrete journey understood through companions, and short scenes at tactical transitions. This reviewer did not independently browse those references. No external styling, code or media was copied. Anti-reference: numbered contracts with narrative pasted above them, distant lore before action, and choices whose only consequence is a different later paragraph.

## Direction contracts

### A — Company & Consequences

- **Purpose and audience:** make the people in the tactical company worth protecting for the owner and native strategy-game players.
- **Screen job:** hear Ivo's immediate need, see the company beside it, choose the practical cost, and follow the company's road to the next prepared encounter.
- **Visual thesis:** people in a recognizable place, speech at the center, orders and their costs immediately below.
- **Layout:** world-scale character scene with a centered speech inset and a broad decision rail. The second screen expands to a three-chapter horizontal road, a left mission/preparation block and a right company grouping. A single upper-right control moves between conversation and road.
- **Typography:** Georgia/Times serif for the scene title and spoken words; Avenir Next/Arial for task text, labels and native controls. Speech uses a narrow readable measure; metadata remains subordinate. Large serif chapter framing continues into preparation.
- **Semantic color:** paper protects reading; ink carries speech and text; olive marks company/action context; rust identifies the speaker; gold is keyboard focus rather than a recommendation. Adult flat illustration supplies the larger color range.
- **Spacing and hierarchy:** 44–48 px outer text gutters, 20–28 px inner reading gutters, 31 px preview footer, separated speech/task/decision zones. Full-world art receives space between the upper scene and lower orders.
- **Interaction thesis:** hear one short authored moment, make a visible consequential choice, and move directly to loadout/preparation. Native Buttons provide hover, pressed and keyboard focus states; preview actions announce their limited result and keep focus.
- **Product-native signature:** the company literally stands between Lantern Gate and the order for Ivo's supply cart; the next screen places its road beside the war chest the player prepares.
- **Deliberate risk:** dialogue staging can cover the world and armed atlas poses can suggest combat during a conversation. Keep dialogue short, preserve visible faces and location, and treat future calmer portrait/location artwork as a separate evidenced asset decision.

Primary: [dialogue 1440×900](../artifacts/story-directions/a-company-consequences-dialogue-1440x900.png). Second context: [road 1440×900](../artifacts/story-directions/a-company-consequences-journey-1440x900.png). Compact: [dialogue 1152×720](../artifacts/story-directions/a-company-consequences-dialogue-1152x720.png), [road 1152×720](../artifacts/story-directions/a-company-consequences-journey-1152x720.png).

### B — Orders & Letters

- **Purpose and audience:** connect the player's tactical orders to the people paying for them, for native strategy players who favor a clear campaign structure.
- **Screen job:** read Ivo's account, understand the next command and route, then sign an informed order and prepare the company.
- **Visual thesis:** military bureaucracy made personal: a numbered order, a human account and a route that records what the company has already done.
- **Layout:** asymmetric account-and-front split in the decision scene; a large twelve-node route beside a narrow preparation docket in the second context. Completed, current and future nodes are differentiated. The route is a single path, with no intersections that imply branching.
- **Typography:** Menlo/Courier for order numbers, chapter labels and administrative metadata; Georgia/Times for the account and mission title; Avenir Next/Arial for practical instructions and controls. Typography changes the information system rather than changing the palette.
- **Semantic color:** paper is the document; ink is the order and its border; olive marks completed route/context; gold marks the next encounter and keyboard focus; rust identifies the missing wages and order number. Future nodes remain paper with visible ink rings.
- **Spacing and hierarchy:** broad account measure beside a restrained map; the mission docket uses a consistent 26 px inset and separates mission, preparation and departure controls. The selected order remains visible while the wider route gives the campaign its finite extent.
- **Interaction thesis:** inspect a person's account before authorizing the next practical command. The preparation docket keeps the mission and costs next to the loadout action. Native preview context and choice controls retain focus.
- **Product-native signature:** a numbered winter order faced with Ivo's account and the stolen households' wages; the military ledger becomes a record of people rather than anonymous payouts.
- **Deliberate risk:** document-first hierarchy can create emotional distance. The account must remain short and prominent; the map must never become a generic contract list with the human stakes relegated to metadata.

Primary: [account 1440×900](../artifacts/story-directions/b-orders-letters-dialogue-1440x900.png). Second context: [ledger 1440×900](../artifacts/story-directions/b-orders-letters-journey-1440x900.png). Compact: [account 1152×720](../artifacts/story-directions/b-orders-letters-dialogue-1152x720.png), [ledger 1152×720](../artifacts/story-directions/b-orders-letters-journey-1152x720.png).

### C — At the Fire

- **Purpose and audience:** build attachment to the recurring company before asking the owner or native strategy players to make its next costly decision.
- **Screen job:** hear a rescued person with Rowan and Lysa present, remember the previous encounter, and prepare for the next promise.
- **Visual thesis:** the company pauses together between encounters; faces and recent shared history lead, and the next mission grows out of that conversation.
- **Layout:** large left conversation area, paired close companion portraits on the right, and a lower promise/decision section. The second context uses an episode-like next mission and recent-memory recap, with preparation next to the companions. Conversation/Camp is the context switch.
- **Typography:** serif chapter and scene titles with a prominent short spoken account; native sans for practical mission text, recap, portrait captions and decisions. Short narrative blocks create a slower reading rhythm than A or B.
- **Semantic color:** paper supports the intimate conversation, stone divides the lower promise section, ink carries speech and names, olive organizes the shared context, rust distinguishes Lysa and Ivo, gold remains focus/preparation accent. Portrait frames crop the approved atlas live and create no new raster asset.
- **Spacing and hierarchy:** 48 px text margins, generous separation between speech and its next promise, two equal portrait frames, and a clearly separated departure area. The recap is quieter than the coming mission.
- **Interaction thesis:** a brief return to the people and what just changed before the next departure. Conversation, remembered actions and chest preparation alternate within one company context rather than an orders map.
- **Product-native signature:** Rowan's old orders and Lysa's rescued brother face the next promise; the chest appears as something the company packs together between episodes.
- **Deliberate risk:** companion pauses can slow the road and become obligatory filler. The existing Lysa atlas still depicts aiming a bow, so the close crop improves intimacy without fully supplying a calm conversation pose. There is no invented campfire asset. Keep scenes brief and do not claim the asset limitation is resolved.

Primary: [conversation 1440×900](../artifacts/story-directions/c-at-the-fire-dialogue-1440x900.png). Second context: [camp 1440×900](../artifacts/story-directions/c-at-the-fire-journey-1440x900.png). Compact: [conversation 1152×720](../artifacts/story-directions/c-at-the-fire-dialogue-1152x720.png), [camp 1152×720](../artifacts/story-directions/c-at-the-fire-journey-1152x720.png).

## Direct rendered critique

The six craft dimensions follow the current design-workflow rubric. Observations compare these previews; no production completion score is assigned before a direction is selected or the actual campaign is integrated.

| Dimension | A — Company & Consequences | B — Orders & Letters | C — At the Fire |
| --- | --- | --- | --- |
| Hierarchy | Ivo's speech leads to the order and exact cost on one screen; the company stays visible. The road keeps the next mission dominant over later chapters. | Order number and mission title lead; the account supplies their human meaning. The route/docket makes the next task easiest to locate, with some emotional distance. | Faces and “Everyone came back” establish a shared pause before the next promise. Preparation requires a slower transition through conversation. |
| Typography | Serif speech and title contrast clearly with practical sans text. The complete Ivo line fits three lines at both sizes; exact costs fit below the choices. Metadata is intentionally compact. | Monospaced order metadata gives a distinct administrative register; broad serif account remains readable. The narrower docket wraps the mission to three lines without crowding its controls. | Serif story titles and shorter text sections create a quieter rhythm. Companion captions remain subordinate; the longer next-task text wraps cleanly. |
| Composition | Strongest world/people/decision connection. Fen was moved out from behind speech. The wide decision rail separates reading from action. Armed poses remain an atlas limitation. | Account/map and map/docket hold different densities without losing the task. The twelve-node route was revised to remove crossing lines; future encounter names are intentionally not all exposed in this preview. | Paired portrait crops give companion presence without full battle silhouettes. Lysa's crop still shows a drawn bow; quieter imagery would further strengthen the stated camp thesis. |
| Identity | Lantern Gate, the company, Ivo and the cart's orders belong to War Chest; changing only the name would not make the scene another product. | Winter wages, personal account and company orders give the ledger a reason. With those removed the layout could become a generic expedition map, so preserve them. | Shared history and named companions belong to the company; its distinctive camp atmosphere is less complete because the available background is still Lantern Gate. |
| Interaction | Equal unselected convoy choices, visible native focus, exact consequence text, preview feedback and context switching verified. Full dialogue pacing, branch application and loadout transition remain production work. | Same verified native controls; context labels reinforce orders/account navigation. Signing a real order and choosing loadouts are outside this probe. | Same verified native controls, with conversation as the next primary step. Skipping optional scenes and returning to the last read line are outside this probe. |
| Responsive | Dialogue and road fit 1440×900 and uniformly scaled 1152×720, retaining every control and consequence. Reflow and larger accessibility text are untested. | Both account and narrow preparation docket remain unclipped at the compact size. Map future nodes are legible but intentionally less informative than a fully explorable production road. | Both portrait/conversation and mission/camp compositions fit the compact size. Portrait detail is softer because it uses close crops of the existing atlas. |

**Recommendation: A.** It best turns the existing game's company and location into a story without putting an administrative step between a person and the player's decision. Its road and spatial chest context keep the journey finite and tactical. B is preferable if accountable orders and route planning should lead the experience. C is preferable if companion pauses should lead, with a greater pacing and artwork burden. Selection remains the owner's choice.

No P0 or P1 clipping, incorrect-choice-content or unusable-control defect remains in these probes. This does not certify every story scene, attachment, replay value, frame pacing, VoiceOver, HIG compliance or buyer satisfaction. Narrative continuity findings are recorded below and are separate from the presentation comparison.

## Native audit evidence and limits

- **Purpose:** authored Scout-to-convoy story content and accurate branch effects; clear next preparation context; every screen identifies itself as an illustrative preview with no saved progress.
- **Accessibility:** native Button labels, 2 px normal boundaries and 3 px gold focus boundaries; controls at least 46 canvas px high (36.8 actual px at the supported compact scaling); no animation. Renderer checks chosen-control focus restoration and a focused context switch. These are signal/state checks, not a manual physical-keyboard or assistive-technology audit. VoiceOver and larger text remain unverified.
- **Behavior:** three choice-feedback checks and three context/focus checks pass; preview-only feedback is explicit. Branch effects, replay, saves, real dialogue advancement and departure are not implemented by the probes.
- **Responsive:** twelve native PNGs cover primary and secondary context at 1440×900 and 1152×720. Every Label/Button is enclosed by the 1440×900 logical canvas. Direct inspection found complete Ivo speech, exact consequences and readable controls at both sizes. Only supported aspect-preserving scaling is exercised, not responsive reflow or tall/wide windows for these new scenes.
- **Performance:** native Godot renderer completed fixture capture without errors on the current machine; static presentation adds no animation or production dependency. No frame-time, release-build or memory claim is made from this capture run.

The revision pass corrected obscured Fen art, a missing illustrated-standard glyph, combat-heavy full-body portraits in C, low-contrast preview footer, narrow aliased choice borders, branch bias, loss of focused control after preview rebuild, and misleading route-line intersections. The same canonical content replaced earlier illustrative first-gate choice sketches before the final owner comparison.

## Native slop-scale capability checkpoints

Platform: `native`. Godot Control scenes expose no browser page, DOM or CSS, so the pinned web scanner cannot inspect them. Numeric slop scores remain unknown; these directions are not described as a scored Clean result.

| Stage | Direction | Status | Evidence |
| --- | --- | --- | --- |
| directions | a-company-consequences | not-applicable | Native dialogue and road PNGs; direct six-dimension review above. |
| directions | b-orders-letters | not-applicable | Native account and ledger PNGs; direct six-dimension review above. |
| directions | c-at-the-fire | not-applicable | Native conversation and camp PNGs; direct six-dimension review above. |

The intentional shared palette and assets preserve the approved adult flat game identity. The systems differ in composition, navigation vocabulary, typography hierarchy, pacing and interaction thesis. The native limitation is recorded per direction in the new receipt; no scan command or numeric result is fabricated.

## Verification

Sources: `tests/story_directions/preview.gd` and `tests/story_directions/render.gd`. These probes never instantiate the game, load settings, read saves, call a network or join production navigation.

Syntax check:

```sh
rtk proxy sh -c '. ./scripts/godot-bin.sh; "$GODOT_BIN" --headless --path . --script tests/story_directions/render.gd --check-only'
```

Native capture and bounded interaction checks:

```sh
rtk proxy sh -c '. ./scripts/godot-bin.sh; "$GODOT_BIN" --path . --script tests/story_directions/render.gd --log-file /tmp/war-chest-story-directions.log -- --story-directions-demo'
```

Observed result: `STORY DIRECTIONS: 12 native fixtures; 6 behavior checks; 0 failures; no game/save access`. Godot 4.7.2, compatibility renderer. Exit 0. Screenshot rendering and native control signals are narrower evidence than a complete physical-input playthrough.

## Independent story voice and continuity review

The twelve encounters have a coherent people-to-orders arc: admit families, recover Ivo, protect food, reveal the stolen wages, return the pay chest. Rowan's accounting and responsibility, Lysa's urgency and dry handling of Fen, and Merrin's practical rune knowledge are distinguishable. Three-line scenes avoid an opening lore dump; the concrete final request to help unload supports the theme better than a final moral speech. Choice consequences change battles and the ending; they are more than cosmetic dialogue branches.

1. **Resolved P1 — unavailable lens in citadel briefing.** The earlier citadel intro described the Watcher's lens and its clear-front advantage before `QUESTS.citadel.relic = lens` is granted after victory. The root agent replaced it with “Their engines mark a front before they fire. Watch the signal. Move out of the blast, and leave Lysa a clear shot.” The current briefing accurately teaches the available bombardment response. Verified in current `story_data.gd`.
2. **Resolved P2 — flooded archive wording.** Bell outro puts Merrin's ledger under water; the earlier relic intro said the seal kept the entire archive dry. The root agent localized the barrier: “The seal holds the water back from the last shelf.” The ledger recovery now makes physical sense without a rules change. Verified in current `story_data.gd`.
3. **Resolved P2 — chest-location handoff.** The earlier winter outro presented the chest's location as unexplained knowledge. The root agent changed Rowan's line to “Merrin's inventory puts the chest beside the Crown's command engine.” This is an explicit source attribution at the winter handoff; the destination was not added to the earlier relic scene. Verified in current `story_data.gd`.
4. **Resolved P2 — identity of final commander.** Crown's signal is already gone when the final briefing names another defended target. The root agent changed “the commander” to “the engine captain,” distinguishing the final machine's crew from the defeated Crown. The commander/escort mechanics remain the same. Verified in current `story_data.gd`.

These are source-based comprehension findings, not evidence that players are emotionally attached or dissatisfied. All four identified content findings are resolved; no additional P0/P1 continuity defect was found in this read. No production story text or UI was edited by this reviewer.
