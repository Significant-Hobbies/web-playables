# Guest rewind qualification — September 9

Scope: [issue 27](https://github.com/sarthakagrawal927/open-historia/issues/27). Local regression proof plus the separately recorded guarded release and real guest acceptance below. No account or database mutation.

## Reproduced failures

At `a79b6e2598cdf965e3cee0fc7e23ca32cf4f0021`, two synthetic guest turns followed by Rewind → Save → Reload → Advance sent `Memory 2` instead of selected snapshot `Memory 1` in the actual `/api/turn` request. Rewind restored the year/map but retained future prompt history and objectives. New turns parented the last snapshot regardless of the selected rewind target.

The previous relation/timeline/order save loss and broad 390px panel overlap were already fixed in `d7a9ecd`/`a79b6e2`; all 10 existing campaign/panel browser checks passed before this work. Do not treat the earlier issue receipt as a current failure of those fixes.

## Contract and repair

New snapshots retain bounded logs, summary, objectives, pending orders, conversation/advisor context, events, relations and province ownership. Rewind restores this context, persists the selected snapshot ID, and a subsequent turn parents that selected snapshot. Future snapshots remain inspectable alternate history, excluded from active prompt memory. The existing 50-snapshot/200-log/200-event retention limits remain; localStorage capacity still bounds the campaign. Older snapshots continue loading for inspection, with explicit unavailable historical-memory wording and no unsafe rewind/branch control. Missing old memory is not reconstructed. The optional memory payload is validated at decode and again before restoration; malformed arrays/records are inspection-only. Explicit empty summaries are preserved. Rewind waits while a turn, diplomacy or advisor request is in flight, preventing delayed future responses from appending after restoration.

Replay interaction uncovered a 390px single-node obstruction beneath the 44px controls. The node track now sits below those controls. The replay popup uses the existing opacity fade instead of a scale transform that overrode its horizontal position, and renders through a portal to escape the timeline stacking context behind Guided Story. Actual clicks, settled viewport bounds and unobscured replay heading are asserted without forced clicks.

## Checks

- `pnpm typecheck`, `pnpm lint`, `pnpm test`: pass; 87 unit tests.
- Full `pnpm test:e2e`: 22 pass, 2 intentional mobile-only skips in the desktop project. Builds the actual app and runs Chromium/WebKit; guest responses are synthetic and external network is blocked in campaign tests.
- Focused post-popup checks cover rewind/reload and legacy inspection on both engines.
- The guest regression inspects the actual next request: selected summary/objective/event history, no future narrative; the following saved snapshot has the selected parent.
- Explicit-empty-summary rewind/reload and pending-advisor/in-flight-turn cases pass through real browser controls on both engines. Pending diplomacy uses the same guard; a separate live diplomacy/provider test was not performed.
- Existing save-quota failure retains the active campaign. Unit roundtrip includes snapshot memory and selected-parent ID.

Build retains pre-existing chunk-size and ineffective dynamic-import warnings. Additional direct hook lint has four existing-style warnings (two `any` casts and two redundant callback dependencies), zero errors; this change does not broaden that cleanup.

Screenshots: [390px legacy replay](legacy-mobile.png), [desktop legacy replay](legacy-desktop.png). These are synthetic local UI, not provider or historical-quality evidence.

## Still unqualified

Keep this owner-held experiment inactive and nonshareable. Generic factions/coarse geography and coherent historical play remain unresolved. Authenticated cloud-save isolation, real provider response quality and production rewind acceptance are not established by these tests. The released scope is recorded below; this is not whole-product historical or authenticated-save qualification. The dossier previously referenced a September 8 qualification directory absent from this checkout; this receipt covers only the fresh local checks above.


## Guarded release and real guest acceptance

Source `d6d052f69942e19362c665ac1ed8dfc99d62a17c` passed [CI 34323177334](https://github.com/sarthakagrawal927/open-historia/actions/runs/34323177334), all six maintained guard gates, and the existing `pnpm run deploy` entry. Worker version `e4a26fe5-9d2f-46fd-83e6-228d1e8c7a75`, deployment `26b34bf1-5493-4f59-89b7-a9557ea54a65`, is verified at 100% with that exact full SHA tag. The browser-loaded public `/play` app entry matches the local deployed build. Rollback remains version `d420bcf2-f9e9-46af-9703-c1aa78b38731` (prior source `a79b6e2`); no migration or provider configuration change occurred.

An isolated real guest campaign at 390px made three successful, unmocked turn requests (2441/2543/1859ms). Two turns, rewind to 1940, save/reload, then another turn verified checkpoint summary, relations and timeline persistence, next-prompt checkpoint memory, and the selected branch parent. A final 1280px desktop reopen preserved the final relation array and active snapshot ID. The badge counts non-neutral relations (2), not all relations (3). The guest save URL in the receipt depends on that browser localStorage and is not a shareable campaign link.

[Machine-readable release/guest receipt](live-receipt.json); [live 390 top controls](live-mobile.png), [live 390 timeline](live-mobile-timeline.png), [live 1280](live-desktop.png). An initial harness stopped on an ambiguous repeated “Game saved” log selector; the corrected final run above passed. Earlier immediate screenshots preceded settled logs; final retained screenshots and reopen assertions supersede them. A plain Python HTTP fetch received403 while the fresh public browser loaded successfully; no global availability failure is inferred.

Remaining observed usability limits: Guided Story can overlap part of the desktop terminal, and mobile branch nodes/labels are crowded. Historical scenario/faction coherence remains unqualified; generated historical text is not asserted factual. Keep issue27 open and this experiment inactive/nonshareable. No owner account data or authenticated cloud save was used.
