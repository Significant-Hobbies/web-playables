# Story Rooms — Product Brief (v0)

**Task**: 14ad2fa6-5c7d-40d4-b292-127dd29f33b9 (Symphony — branch archive + AI co-author)  
**Prior**: 077dac23-07d4-4eee-8fc8-6a6ca0e41937 (v0 voted story room)  
**Source**: saas-ideas consolidation (aba1a83) + StoryTunes note, consolidated into "Social Creative Worlds" cluster.  
**Home for prototype**: open-historia (this file + `/story-room` route).  
**Status**: v0.1 local prototype — branch archive (replay/revive) + fixture AI co-author suggestions. See "Placement note" below.

---

## Premise

Story rooms are a **collaborative canon-ritual mode** for Open Historia.

Players (or a solo tester + simulated scribes + optional AI) gather around a shared historical or alternate-history prompt. Instead of solo grand-strategy commands or freeform writing, they participate in a short, social, high-stakes loop:

- Propose the *next beat* of the story (timed, constrained).
- Vote on which telling becomes *canon*.
- The winner is appended to the running record.
- Every rejected proposal is **preserved** as a visible "apocryphal branch" — the roads not taken.

The tone is playful theater, not productivity software: "the scribes have spoken," "the hall roars," "this telling is now the record."

It deliberately overlaps Open Historia's existing solo strengths (alternate-history presets, `storySoFar` compression, private timeline branching, StoryPath guided scenarios) to test whether **voted collaborative canon + AI co-authors** belong here as a first-class "story room scenario mode."

---

## Core Loop (one round, repeatable)

1. **Room & prompt**  
   A short seed paragraph + evocative title (e.g. "CANON FORGE // The night the Library burned — but didn't").

2. **Timed submissions** (playful constraint)  
   Each participant writes 1–3 sentences / one surprising ripple. Hard cap (~220 chars). Language of ritual, not docs: "tellings," "beats," "scrolls." No long essays, no rich text.

3. **Votes**  
   Proposals appear as cards (attributed for personality, or could be blinded). Each person casts one vote for their favorite. Live tally. "Simulate the crowd" for demo/solo play.

4. **Canon winner**  
   Highest votes wins. Its text is appended to the growing "canon so far." A short crowd-verdict flavor line comments on margin (unanimous roar / narrow / split hall).

5. **Rejected branch preservation (archive)**  
   All other submissions go into "Apocrypha" for the round, then into a persistent **Divergent Scrolls / branch archive** for the session. They are not deleted. **Replay** expands a what-if read; **Revive** pre-fills the player's next offering from that branch.

6. **Optional AI persona (fixture co-author)**  
   Toggle "Include AI co-author" for simulated rounds. Choose a persona placeholder (Grok • Speculative Engine, Clio the Unreliable Narrator). **Suggest a branch** picks one telling from fixture banks weighted by canon context — no network, no tokens. Player can adopt, submit as-is, or dismiss.

After canonization the room immediately offers "Begin the next round on this canon" (the record grows) or "Forge an entirely new legend."

---

## What It Is Not (anti-generic-editor rules)

- Not a collaborative document editor, Notion, or wiki.
- No live cursors, no multi-user editing of the same text, no comments threads on prose.
- No long-form writing, no version history browser, no "publish to web."
- Submissions are ritual offerings, not drafts. The product is the **vote + canonization ceremony**, not the accumulation of text.
- Keep it short-burst, social, history-flavored, slightly absurd.

If it starts feeling like "Google Docs with history cosplay," we have failed the brief.

---

## v0.1 Scope (this task — deliberately smallest)

- One static product brief (this file).
- One fully playable **local-only** prototype at `/story-room`: submit → vote → canon, multi-round canon growth, **branch archive with replay/revive**, fixture **AI co-author suggestions** (`lib/story-room-fixtures.ts`).
- Zero impact on core strategy saves: no DB writes, no `provinceOwners`, no `useGameState`, no Timeline snapshots, no api/turn, no cloud saves.
- Pure client state + fixture banks for sim + AI (no paid APIs).
- Visual timer display + manual phase-advance buttons (demo speed > realism).
- Consistent Open Historia dark/amber/emerald/rose/monospace aesthetic.
- Heavy "PROTOTYPE — local only — StoryTunes fit test" banners.

Future real multi-user rooms, persistence, presence, or export-to-preset would be separate tasks (and may argue for a different home).

---

## Placement Note & Recommendation (updated post-prototype)

**Exploration grounding**:
- Open Historia already owns solo "what if" + branching preservation (StoryPath, Timeline private forks, alternate presets, storySoFar).
- The voted-canon + apocrypha loop is a direct social multiplayer evolution of that DNA.
- LinkChat's model (per-slug pages + AI chat + client roomId storage) is about personal broadcast + conversational memory, not ritual narrative voting on historical beats.
- ai-game has "canon_review" as an ingest quality gate for generated story packages (human approval for fidelity), but is fundamentally agent simulation + replay, not human co-authors casting votes in a "hall."

**After building + verifying the v0 prototype** (typecheck + targeted lint clean; one full submit/vote/canon cycle + next-round flow implemented and reviewed in code):
The mechanics feel *native* inside Open Historia. The existing alternate-history flavor, the love of preserved branches, and the "AI as game master / co-author" contract already present make story rooms a natural "scenario mode" rather than a bolted-on social layer. Smallest app check passed with zero new errors.

**Recommendation from this task**:
- **Keep the concept and iteration inside open-historia for now.**
- Treat `/story-room` (or a future promoted version) as an optional mode alongside solo grand strategy.
- Possible future light integration: a canon winner could be offered as the seed for a new solo StoryPath or timeline branch — but *only* after the prototype has proven the ritual is fun.
- Re-evaluate extraction only if real multi-user persistent rooms with auth/presence become the dominant use case (at which point LinkChat's chat-room primitives or a tiny dedicated narrative service might make sense). Do not move prematurely; the first proof belongs where the narrative soul already lives.

Record this note in the saas-maker task row and any future plans.

---

## Open Questions (for later)

- Should canon winners be exportable as new presets or StoryPath steps for solo play?
- Real rooms: ephemeral (localStorage) vs. short-lived cloud rooms vs. persistent named rooms?
- Blind vs. attributed votes? (v0 uses attributed for personality theater.)
- How many humans vs. AI co-authors feels right?
- Later: "the crowd" as real-time other players, or always hybrid with AI scribes?

---

## References

- saas-maker/docs/ideas/saas-ideas-consolidation-2026-06-03.md (StoryTunes row + Social Creative Worlds)
- This repo's AGENTS.md, CLAUDE.md, existing StoryPath + Timeline code
- `/story-room` (the v0 prototype itself)
- Task 14ad2fa6-5c7d-40d4-b292-127dd29f33b9 in Symphony (branch archive + AI co-author)
- Task 077dac23-07d4-4eee-8fc8-6a6ca0e41937 (prior v0 story room)

**Do not turn this into a generic editor. Keep the ritual.**

---

*Short artifact (journey + learning). One canonical home. ~120 lines.*