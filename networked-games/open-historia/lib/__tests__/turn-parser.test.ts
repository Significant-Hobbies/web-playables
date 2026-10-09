import { describe, expect, it } from 'vitest';

import {
  extractJsonCandidate,
  normalizeEventType,
  parseAiTurnResponse,
  sanitizeAiPayload,
} from '../turn-parser';

// ---------------------------------------------------------------------------
// These tests guard the trust boundary between the LLM and game state.
// The single most important invariant: malformed or structurally-invalid AI
// output must NEVER throw and must NEVER produce a state mutation
// (`updates` must be `[]`). A corrupt turn must be a no-op, not a crash.
// ---------------------------------------------------------------------------

const FALLBACK_YEAR = 1500;

describe('normalizeEventType', () => {
  it('passes through every valid event type', () => {
    for (const t of ['diplomacy', 'war', 'discovery', 'flavor', 'economy', 'crisis']) {
      expect(normalizeEventType(t)).toBe(t);
    }
  });

  it('falls back to flavor for unknown / invalid types', () => {
    expect(normalizeEventType('nonsense')).toBe('flavor');
    expect(normalizeEventType('War')).toBe('flavor'); // case-sensitive
    expect(normalizeEventType(undefined)).toBe('flavor');
    expect(normalizeEventType(null)).toBe('flavor');
    expect(normalizeEventType(42)).toBe('flavor');
    expect(normalizeEventType({})).toBe('flavor');
  });
});

describe('extractJsonCandidate', () => {
  it('returns plain JSON unchanged', () => {
    expect(extractJsonCandidate('{"message":"hi"}')).toBe('{"message":"hi"}');
  });

  it('strips ```json fences', () => {
    const raw = '```json\n{"message":"hi"}\n```';
    expect(extractJsonCandidate(raw)).toBe('{"message":"hi"}');
  });

  it('strips bare ``` fences', () => {
    const raw = '```\n{"message":"hi"}\n```';
    expect(extractJsonCandidate(raw)).toBe('{"message":"hi"}');
  });

  it('extracts JSON when the model adds prose around it', () => {
    const raw = 'Sure, here is the turn:\n{"message":"hi"}\nHope that helps!';
    expect(extractJsonCandidate(raw)).toBe('{"message":"hi"}');
  });

  it('keeps nested objects intact with the greedy match', () => {
    const raw = 'prefix {"a":{"b":1},"c":2} suffix';
    expect(extractJsonCandidate(raw)).toBe('{"a":{"b":1},"c":2}');
  });

  it('returns null for non-string input', () => {
    expect(extractJsonCandidate(undefined)).toBeNull();
    expect(extractJsonCandidate(null)).toBeNull();
    expect(extractJsonCandidate(123)).toBeNull();
    expect(extractJsonCandidate({})).toBeNull();
  });

  it('returns trimmed text when there is no brace candidate', () => {
    expect(extractJsonCandidate('  just prose  ')).toBe('just prose');
  });

  it('returns null for empty / whitespace-only input', () => {
    expect(extractJsonCandidate('')).toBeNull();
    expect(extractJsonCandidate('   ')).toBeNull();
  });
});

describe('sanitizeAiPayload — happy path', () => {
  it('keeps a well-formed payload with mixed updates', () => {
    const result = sanitizeAiPayload(
      {
        message: '  The empire expands.  ',
        storySoFar: '  A long tale  ',
        updates: [
          { type: 'owner', provinceName: ' Gaul ', newOwnerId: ' player ' },
          { type: 'time', amount: 5 },
          {
            type: 'event',
            description: ' A great discovery ',
            eventType: 'discovery',
            year: 1492,
          },
          {
            type: 'relation',
            nationA: ' Rome ',
            nationB: ' Carthage ',
            relationType: ' war ',
            reason: ' border dispute ',
          },
          {
            type: 'storyStep',
            stepId: ' step1 ',
            message: ' Goal reached! ',
          },
        ],
      },
      FALLBACK_YEAR
    );

    expect(result.message).toBe('The empire expands.');
    expect(result.storySoFar).toBe('A long tale');
    expect(result.updates).toEqual([
      { type: 'owner', provinceName: 'Gaul', newOwnerId: 'player' },
      { type: 'time', amount: 5 },
      {
        type: 'event',
        description: 'A great discovery',
        eventType: 'discovery',
        year: 1492,
      },
      {
        type: 'relation',
        nationA: 'Rome',
        nationB: 'Carthage',
        relationType: 'war',
        reason: 'border dispute',
      },
      {
        type: 'storyStep',
        stepId: 'step1',
        message: 'Goal reached!',
      },
    ]);
  });
});

describe('sanitizeAiPayload — invalid output must not corrupt state', () => {
  it('returns a safe default for non-object payloads', () => {
    for (const bad of [null, undefined, 'a string', 42, true]) {
      const result = sanitizeAiPayload(bad, FALLBACK_YEAR);
      expect(result.updates).toEqual([]);
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.storySoFar).toBeUndefined();
    }
  });

  it('treats a top-level array payload as empty (no updates)', () => {
    const result = sanitizeAiPayload([{ type: 'owner' }], FALLBACK_YEAR);
    expect(result.updates).toEqual([]);
  });

  it('drops updates when `updates` is not an array', () => {
    const result = sanitizeAiPayload({ message: 'hi', updates: 'not-an-array' }, FALLBACK_YEAR);
    expect(result.updates).toEqual([]);
  });

  it('skips owner updates missing required fields', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'owner', provinceName: 'Gaul' }, // no newOwnerId
          { type: 'owner', newOwnerId: 'player' }, // no provinceName
          { type: 'owner', provinceName: '', newOwnerId: 'player' }, // empty
          { type: 'owner', provinceName: 'Gaul', newOwnerId: 5 }, // wrong type
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('skips time updates whose amount is not finite', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'time', amount: 'abc' },
          { type: 'time', amount: NaN },
          { type: 'time', amount: Infinity },
          { type: 'time' },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('coerces numeric-string time amounts and truncates', () => {
    const result = sanitizeAiPayload({ updates: [{ type: 'time', amount: '7.9' }] }, FALLBACK_YEAR);
    expect(result.updates).toEqual([{ type: 'time', amount: 7 }]);
  });

  it('uses the fallback year when an event year is missing or invalid', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'event', description: 'no year' },
          { type: 'event', description: 'bad year', year: 'not-a-year' },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([
      {
        type: 'event',
        description: 'no year',
        eventType: 'flavor',
        year: FALLBACK_YEAR,
      },
      {
        type: 'event',
        description: 'bad year',
        eventType: 'flavor',
        year: FALLBACK_YEAR,
      },
    ]);
  });

  it('skips event updates without a usable description', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'event', eventType: 'war' }, // no description
          { type: 'event', description: '   ', eventType: 'war' }, // blank
          { type: 'event', description: 123 }, // wrong type
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('skips relation updates missing required fields', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'relation', nationA: 'Rome', nationB: 'Gaul' }, // no relationType
          { type: 'relation', nationA: 'Rome', relationType: 'war' }, // no nationB
          {
            type: 'relation',
            nationA: '',
            nationB: 'Gaul',
            relationType: 'war',
          },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('ignores unknown update types entirely', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'nuke', provinceName: 'Gaul' },
          { type: 'owner', provinceName: 'Gaul', newOwnerId: 'player' },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([{ type: 'owner', provinceName: 'Gaul', newOwnerId: 'player' }]);
  });

  it('skips non-object entries inside the updates array', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          null,
          'string',
          42,
          [],
          { type: 'owner', provinceName: 'Gaul', newOwnerId: 'player' },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([{ type: 'owner', provinceName: 'Gaul', newOwnerId: 'player' }]);
  });

  it('drops a blank message and substitutes a safe default', () => {
    const result = sanitizeAiPayload({ message: '   ' }, FALLBACK_YEAR);
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('handles a non-finite fallback year without producing NaN', () => {
    const result = sanitizeAiPayload({ updates: [{ type: 'event', description: 'ev' }] }, NaN);
    expect(result.updates[0]).toMatchObject({ type: 'event', year: 0 });
  });
});

describe('parseAiTurnResponse — malformed AI output is a safe no-op', () => {
  it('flags truncated JSON as a parse error with zero updates', () => {
    const result = parseAiTurnResponse(
      '{"message":"war begins","updates":[{"type":"owner"',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('flags pure prose (no JSON) as a parse error', () => {
    const result = parseAiTurnResponse("I'm sorry, I cannot complete that request.", FALLBACK_YEAR);
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('flags an empty response as a parse error', () => {
    const result = parseAiTurnResponse('', FALLBACK_YEAR);
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('flags a non-string response (null/undefined) as a parse error', () => {
    for (const bad of [null, undefined, {}, 123]) {
      const result = parseAiTurnResponse(bad, FALLBACK_YEAR);
      expect(result.parseError).toBe(true);
      expect(result.updates).toEqual([]);
    }
  });

  it('flags JSON with single quotes (not valid JSON) as a parse error', () => {
    const result = parseAiTurnResponse("{'message':'oops'}", FALLBACK_YEAR);
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('parses valid JSON wrapped in a fenced code block', () => {
    const result = parseAiTurnResponse(
      '```json\n{"message":"The siege holds.","updates":[{"type":"time","amount":1}]}\n```',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(false);
    expect(result.message).toBe('The siege holds.');
    expect(result.updates).toEqual([{ type: 'time', amount: 1 }]);
  });

  it('parses valid JSON with surrounding prose', () => {
    const result = parseAiTurnResponse(
      'Here you go: {"message":"Onward.","updates":[]} — good luck!',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(false);
    expect(result.message).toBe('Onward.');
    expect(result.updates).toEqual([]);
  });

  it('does NOT flag valid JSON of the wrong shape, but drops bad updates', () => {
    // Valid JSON, structurally wrong — parseError is false (it parsed) but the
    // garbage updates are all dropped, so game state stays intact.
    const result = parseAiTurnResponse(
      '{"message":42,"updates":[{"type":"owner","provinceName":null}]}',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(false);
    expect(result.updates).toEqual([]);
    expect(result.message.length).toBeGreaterThan(0); // safe default
  });

  it('treats a JSON array response as having no updates', () => {
    // `[1,2,3]` is valid JSON but the wrong shape — it parses cleanly, so
    // `parseError` is false, yet the array is coerced to an empty payload so
    // no updates ever reach game state.
    const result = parseAiTurnResponse('[1,2,3]', FALLBACK_YEAR);
    expect(result.parseError).toBe(false);
    expect(result.updates).toEqual([]);
  });

  it('never throws on a wide range of hostile inputs', () => {
    const hostile: unknown[] = [
      undefined,
      null,
      '',
      '{',
      '}',
      '{}{}',
      '{"updates":',
      '```json```',
      '{"updates":[{},{},{}]}',
      ' ',
      '{'.repeat(1000),
      JSON.stringify({ updates: Array(500).fill({ type: 'bogus' }) }),
    ];
    for (const input of hostile) {
      expect(() => parseAiTurnResponse(input, FALLBACK_YEAR)).not.toThrow();
      const result = parseAiTurnResponse(input, FALLBACK_YEAR);
      expect(Array.isArray(result.updates)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Additional coverage flagged by fleet PLAN.md as the "game-corrupting"
// failure mode: AI-JSON parse failures must not corrupt prior game state.
//
// These tests target gaps in the original suite:
//   - trailing commas in JSON (a common LLM mistake)
//   - schema-valid but semantically-impossible values
//   - direct verification of the "prior state preserved" invariant by
//     running the parser output through a faithful copy of the consumer's
//     apply-updates reducer (mirroring `hooks/useTurnProcessing.ts`).
// ---------------------------------------------------------------------------

describe('parseAiTurnResponse — additional malformed-JSON shapes', () => {
  it('flags JSON with a trailing comma in updates as a parse error', () => {
    const result = parseAiTurnResponse(
      '{"message":"x","updates":[{"type":"time","amount":1},]}',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('flags JSON with a trailing comma on the root object as a parse error', () => {
    const result = parseAiTurnResponse('{"message":"x","updates":[],}', FALLBACK_YEAR);
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('flags JSON missing a closing brace as a parse error', () => {
    const result = parseAiTurnResponse(
      '{"message":"x","updates":[{"type":"time","amount":1}]',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('flags JSON with an unterminated string as a parse error', () => {
    const result = parseAiTurnResponse('{"message":"never ends, "updates":[]}', FALLBACK_YEAR);
    expect(result.parseError).toBe(true);
    expect(result.updates).toEqual([]);
  });

  it('ignores a __proto__ key in an update without polluting Object.prototype', () => {
    const before = (Object.prototype as Record<string, unknown>).polluted;
    const result = parseAiTurnResponse(
      '{"updates":[{"type":"owner","provinceName":"Gaul","newOwnerId":"player","__proto__":{"polluted":true}}]}',
      FALLBACK_YEAR
    );
    expect(result.parseError).toBe(false);
    expect((Object.prototype as Record<string, unknown>).polluted).toBe(before);
  });
});

describe('sanitizeAiPayload — semantically-impossible values', () => {
  it('rejects a negative `time.amount` to prevent AI-driven rewinds', () => {
    const result = sanitizeAiPayload(
      { updates: [{ type: 'time', amount: -1_000_000 }] },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('accepts a zero `time.amount` (no-op, not a corruption)', () => {
    const result = sanitizeAiPayload({ updates: [{ type: 'time', amount: 0 }] }, FALLBACK_YEAR);
    expect(result.updates).toEqual([{ type: 'time', amount: 0 }]);
  });

  it('currently passes through a far-future / far-past event year', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'event', description: 'Anachronism', year: -50_000 },
          { type: 'event', description: 'Year 9 million', year: 9_000_000 },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([
      { type: 'event', description: 'Anachronism', eventType: 'flavor', year: -50_000 },
      { type: 'event', description: 'Year 9 million', eventType: 'flavor', year: 9_000_000 },
    ]);
  });

  it('rejects an owner update where the newOwnerId is whitespace only', () => {
    const result = sanitizeAiPayload(
      { updates: [{ type: 'owner', provinceName: 'Gaul', newOwnerId: '   ' }] },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('rejects a relation update where nationA and nationB are the same (self-relation)', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          {
            type: 'relation',
            nationA: 'Rome',
            nationB: 'Rome',
            relationType: 'war',
            reason: 'civil war',
          },
          {
            type: 'relation',
            nationA: '  Rome  ',
            nationB: 'Rome',
            relationType: 'war',
            reason: "whitespace shouldn't bypass",
          },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });

  it('drops a storyStep update with a blank stepId', () => {
    const result = sanitizeAiPayload(
      {
        updates: [
          { type: 'storyStep', stepId: '   ', message: 'Goal!' },
          { type: 'storyStep', message: 'Goal!' },
        ],
      },
      FALLBACK_YEAR
    );
    expect(result.updates).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Apply-updates reducer mirroring `hooks/useTurnProcessing.ts`.
//
// We do NOT import the hook (it depends on React state). Instead we replicate
// just the slice of logic that mutates game state, so we can directly assert:
// "given parser output for malformed AI, applying it to a frozen game state
// produces an IDENTICAL state."
//
// Mirrors `useTurnProcessing.processCommand` lines ~148-261 as of the writing
// of this test. If that consumer logic changes, this reducer must follow.
// ---------------------------------------------------------------------------

interface TestProvince {
  id: string;
  name: string;
  ownerId: string | null;
}
interface TestGameState {
  turn: number;
  provinces: TestProvince[];
  events: { id: string; year: number; description: string; type: string }[];
  relations: { nationA: string; nationB: string; type: string }[];
  completedStepIds: string[];
}

function applyParsedUpdatesToState(state: TestGameState, updates: unknown[]): TestGameState {
  // Defensive deep-ish clone so callers can compare references freely.
  let next: TestGameState = {
    ...state,
    provinces: state.provinces.map((p) => ({ ...p })),
    events: [...state.events],
    relations: [...state.relations],
    completedStepIds: [...state.completedStepIds],
  };

  for (const raw of updates) {
    const u = raw as Record<string, unknown>;
    if (u.type === 'owner') {
      const pName = (u.provinceName as string).toLowerCase();
      next = {
        ...next,
        provinces: next.provinces.map((p) =>
          p.name.toLowerCase() === pName ? { ...p, ownerId: u.newOwnerId as string } : p
        ),
      };
    } else if (u.type === 'event') {
      next = {
        ...next,
        events: [
          ...next.events,
          {
            id: `ev-${next.events.length}`,
            year: (u.year as number) ?? next.turn,
            description: u.description as string,
            type: (u.eventType as string) ?? 'flavor',
          },
        ],
      };
    } else if (u.type === 'relation') {
      next = {
        ...next,
        relations: [
          ...next.relations,
          {
            nationA: u.nationA as string,
            nationB: u.nationB as string,
            type: u.relationType as string,
          },
        ],
      };
    } else if (u.type === 'time') {
      next = { ...next, turn: next.turn + (u.amount as number) };
    } else if (u.type === 'storyStep') {
      const id = u.stepId as string;
      if (!next.completedStepIds.includes(id)) {
        next = {
          ...next,
          completedStepIds: [...next.completedStepIds, id],
        };
      }
    }
  }
  return next;
}

function makeBaseState(): TestGameState {
  return {
    turn: 1500,
    provinces: [
      { id: 'p1', name: 'Gaul', ownerId: null },
      { id: 'p2', name: 'Britannia', ownerId: 'player' },
    ],
    events: [{ id: 'ev-seed', year: 1499, description: 'World begins', type: 'flavor' }],
    relations: [{ nationA: 'Rome', nationB: 'Carthage', type: 'neutral' }],
    completedStepIds: ['intro'],
  };
}

describe('game-state invariant — parse failures must NOT mutate prior state', () => {
  const corruptInputs: { label: string; input: unknown }[] = [
    { label: 'truncated JSON', input: '{"message":"war","updates":[{"type":"owner"' },
    { label: 'trailing comma', input: '{"updates":[],}' },
    { label: 'pure prose', input: 'I cannot help with that.' },
    { label: 'empty string', input: '' },
    { label: 'whitespace only', input: '   \n  ' },
    { label: 'null', input: null },
    { label: 'undefined', input: undefined },
    { label: 'single-quoted JSON', input: "{'updates':[]}" },
    { label: 'JSON array root', input: '[1,2,3]' },
    { label: 'unterminated string', input: '{"message":"oops}' },
    { label: 'fenced empty', input: '```json```' },
    { label: 'object literal stringified incorrectly', input: '[object Object]' },
  ];

  for (const { label, input } of corruptInputs) {
    it(`leaves prior game state structurally identical for: ${label}`, () => {
      const before = makeBaseState();
      const snapshot = JSON.parse(JSON.stringify(before)) as TestGameState;

      const parsed = parseAiTurnResponse(input, before.turn);

      // Either parseError is true OR the payload parsed but yielded no updates.
      // Either way, applying it must be a no-op on game state.
      expect(parsed.updates).toEqual([]);

      const after = applyParsedUpdatesToState(before, parsed.updates);

      // Structural equality — prior state preserved.
      expect(after).toEqual(snapshot);
      // And the human-facing message is non-empty so the UI can surface it.
      expect(parsed.message.length).toBeGreaterThan(0);
    });
  }

  it("applies a valid turn's updates as expected (positive control)", () => {
    const before = makeBaseState();
    const parsed = parseAiTurnResponse(
      JSON.stringify({
        message: 'Rome marches west.',
        updates: [
          { type: 'owner', provinceName: 'Gaul', newOwnerId: 'Rome' },
          { type: 'time', amount: 1 },
          { type: 'storyStep', stepId: 'first-conquest', message: 'Done!' },
        ],
      }),
      before.turn
    );

    expect(parsed.parseError).toBe(false);
    const after = applyParsedUpdatesToState(before, parsed.updates);

    expect(after.turn).toBe(before.turn + 1);
    expect(after.provinces.find((p) => p.id === 'p1')?.ownerId).toBe('Rome');
    expect(after.completedStepIds).toContain('first-conquest');
    // And we did not mutate the original.
    expect(before.turn).toBe(1500);
    expect(before.provinces[0].ownerId).toBeNull();
  });

  it('schema-valid JSON with garbage update payloads is also a no-op on game state', () => {
    // The classic "AI returned the right shape but every field is wrong" case.
    const before = makeBaseState();
    const snapshot = JSON.parse(JSON.stringify(before)) as TestGameState;
    const parsed = parseAiTurnResponse(
      JSON.stringify({
        message: 42, // wrong type — dropped, default substituted
        updates: [
          { type: 'owner', provinceName: null, newOwnerId: 5 },
          { type: 'time', amount: 'not a number' },
          { type: 'event', description: '' },
          { type: 'relation', nationA: '', nationB: 'X', relationType: '' },
          { type: 'nuke', provinceName: 'Gaul' },
          null,
          [],
          'string-not-object',
        ],
      }),
      before.turn
    );

    expect(parsed.parseError).toBe(false);
    expect(parsed.updates).toEqual([]);
    const after = applyParsedUpdatesToState(before, parsed.updates);
    expect(after).toEqual(snapshot);
  });
});
