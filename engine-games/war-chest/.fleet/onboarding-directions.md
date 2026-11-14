# Opening direction selection — A selected and implemented locally

Current status: the owner selected A. The approved Banner & Steel system and playable opening are now implemented; native visual acceptance remains pending. See [implementation evidence](banner-steel-review.md). The brief and concept descriptions below preserve the selection history; generated previews are not game screenshots.

September 23, 2026. Owner says the current game looks childish, asks for easier launch and onboarding that attracts them. The local app launcher is separate completed packaging work. This document is design evidence for issue #1, not a replacement implementation specification. Remote issue writes remain unavailable in this session.

## Shared brief

War Chest helps Sarthak grow an enduring warband through tactical battles and spatial equipment builds. Computer, full-window 2D, fully turn-based, no purchases or daily obligation. First-session job: understand one combat decision and want to win the first piece of equipment. Same evaluation scene for all directions: The Lantern Gate, hold for four turns, four orders, gate 30/30, Rowan/Lysa/Fen, three fronts, Strike/Guard/Move/Volley/End turn. One contextual instruction rather than a tour or tutorial wall.

Use the existing game content for the opening; do not imply a longer campaign or extra systems exist. New pacing needs explicit save-compatible implementation after selection. Concept art includes illustrative values and keys, not an exact game-state specification. All hero-specific commands and previews must obey the existing rules when implemented.

## A — Banner & Steel (recommended)

Preview: `artifacts/onboarding-directions/a-banner-steel.png`.

World-first illustrated company. Three broad approaches occupy most of the screen; compact bottom equipment rail and one local teaching line. Flat, two-tone angular cartoon art with adult proportions. Warm limestone, olive terrain, navy allies, brick enemies, ochre active command. Compact serif titles and clean sans rules; restrained square controls with generous separation. Interaction is select hero → equipment command → target. Signature: cloth company standards make the squad's identity visible on the battlefield. Risk: perspective must not obscure the three fronts or imply free-grid movement that the game does not support.

The first generated A was too painterly/detailed; retained preview is the simplified second version. This keeps a cartoon character without the chibi proportions or candy-colored chrome the owner rejected.

## B — Field Orders

Preview: `artifacts/onboarding-directions/b-field-orders.png`.

Overhead map-first strategy. Most of the screen is a map with shield tokens; selected-hero commands occupy one right rail. Ivory and graphite ground, olive terrain, navy allies, vermilion hostiles, active ochre. Technical numerals, compact sans typography, consistent tiny unit markers. Interaction emphasizes route and intent preview before committing an order. Signature: the company becomes a set of field-order marks on its own campaign map. Risk: less emotional attachment to individual heroes; background detail must be further quieted in actual implementation. Generated stat abbreviations, distance scale and keyboard hints are not promises of new mechanics.

## C — Ink & Ember

Preview: `artifacts/onboarding-directions/c-ink-ember.png`.

Graphic-novel battle. Three full-width lateral strips, a narrow turn ledger, and printed command seals below. Charcoal/cream with ember accents, angular serif titles, sans tactical labels. Intent and attack feedback use short ink-stroke marks. Signature: each front reads as a chapter in the company's first defense. Risk: dark ink masses may feel too severe and hide detail; no gore, and no decorative texture behind small rules. Generated visual drama must not increase cognitive load.

## Proposed playable hook

1. Open onto the threatened Lantern Gate with the starter company already equipped. One sentence of stakes, then control. No account, company-creation form or keep-management chores first.
2. Teach a useful attack through one contextual hint. Enemy intent then makes protection meaningful. Hints remain optional; player retains turn-based decisions and Undo.
3. First victory introduces one earned equipment decision. Show the ability it grants and its packing footprint; do not simultaneously explain every progression system.
4. A short packing interaction leads directly to the next battle, where the new ability has a clear use.
5. Recruitment, optional side stories, banners and repeatable contracts are introduced over later milestones. Existing owners keep progress and access; a new opening must never reset their campaign.

This is an intended sequence, not a claim of tested fun or an implemented redesign. Onboarding can explain choices but cannot compensate for battles that are tactically trivial; actual encounters need playtesting after integration.

## Generation and review

Built-in imagegen, separate prompts per direction; no external art copied. Prompt set: shared same-content 16:10 first-battle brief above, then each direction's composition/type/color/interaction contract; forbid chibi, realism, 3D, marketing chrome and tutorial walls. A refinement preserves composition/content while replacing painterly detail with flat two-tone illustration, simplifying its portrait and removing inventory-only ornaments. Source generations remain under `/Users/sarthak/.codex/generated_images/01a0c9fa-25af-79e3-9fb3-b6fe0f5edb22/`.

Anti-reference: current oversized-head figures, pastel scenery and bubbly app-like controls; also reject dense realistic fantasy decoration. Each direction changes composition and interaction hierarchy, not just color. Generic dashboard substitution fails the subject-swap test: these screens are defined by three defended approaches, named troops, enemy intent and gear-derived orders.

The owner subsequently selected A. Implementation follows that direction; native rendering, animation quality and human balance review remain unqualified. No fabricated quality scores.

The concept-round design-workflow check failed with selection pending. Selection is now recorded; completion still requires native visual evidence and a clean project check. Its web-library/mobile-width requirements do not fit this native game and are not replaced with made-up evidence. Previous implementation receipt is preserved at `.fleet/journey-design-review.json`.
