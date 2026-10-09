// ---------------------------------------------------------------------------
// AI turn-response parsing for /api/turn.
//
// This module is the trust boundary between the LLM's free-form output and the
// game state. The Game Master AI is instructed to return strict JSON, but in
// practice it may return: prose, fenced code blocks, truncated JSON, valid JSON
// with the wrong shape, or numbers-as-strings. None of that may corrupt game
// state — every parse path must produce a safe, fully-typed payload and the
// extraction itself must never throw.
// ---------------------------------------------------------------------------

export type EventType = 'diplomacy' | 'war' | 'discovery' | 'flavor' | 'economy' | 'crisis';

export type ParsedUpdate =
  | { type: 'owner'; provinceName: string; newOwnerId: string }
  | { type: 'time'; amount: number }
  | {
      type: 'event';
      description: string;
      eventType: EventType;
      year: number;
    }
  | {
      type: 'relation';
      nationA: string;
      nationB: string;
      relationType: string;
      reason: string;
    }
  | {
      type: 'storyStep';
      stepId: string;
      message: string;
    };

export interface SanitizedTurn {
  message: string;
  updates: ParsedUpdate[];
  storySoFar?: string;
}

export interface ParsedTurnResult extends SanitizedTurn {
  /** True when the raw text could not be parsed as JSON at all. */
  parseError: boolean;
}

const DEFAULT_MESSAGE = 'The world watches your move. Issue your next command.';

export const normalizeEventType = (eventType: unknown): EventType => {
  if (
    eventType === 'diplomacy' ||
    eventType === 'war' ||
    eventType === 'discovery' ||
    eventType === 'flavor' ||
    eventType === 'economy' ||
    eventType === 'crisis'
  ) {
    return eventType;
  }
  return 'flavor';
};

/**
 * Pulls a JSON object out of raw LLM text. The model frequently wraps JSON in
 * ```json fences or adds a sentence before/after it. Returns `null` when no
 * brace-delimited candidate exists — callers must handle that.
 */
export function extractJsonCandidate(responseText: unknown): string | null {
  if (typeof responseText !== 'string') return null;
  const stripped = responseText.replace(/```json/gi, '').replace(/```/g, '');
  // Greedy match grabs the outermost {...} so nested objects survive.
  const match = stripped.match(/(\{[\s\S]*\})/);
  const candidate = match?.[1] ?? stripped.trim();
  return candidate.length > 0 ? candidate : null;
}

/**
 * Coerces an already-parsed (untrusted) value into a fully-typed turn payload.
 * Every field is validated; anything malformed is dropped, never thrown.
 * A non-object payload yields the safe default — game state is left untouched.
 */
export function sanitizeAiPayload(payload: unknown, fallbackYear: number): SanitizedTurn {
  const safeYear = Number.isFinite(fallbackYear) ? Math.trunc(fallbackYear) : 0;

  const safePayload = (
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  ) as {
    message?: unknown;
    updates?: unknown;
    storySoFar?: unknown;
  };

  const message =
    typeof safePayload.message === 'string' && safePayload.message.trim()
      ? safePayload.message.trim()
      : DEFAULT_MESSAGE;

  const updates: ParsedUpdate[] = [];
  if (Array.isArray(safePayload.updates)) {
    for (const update of safePayload.updates) {
      if (!update || typeof update !== 'object' || Array.isArray(update)) {
        continue;
      }
      const u = update as Record<string, unknown>;

      if (
        u.type === 'owner' &&
        typeof u.provinceName === 'string' &&
        u.provinceName.trim() &&
        typeof u.newOwnerId === 'string' &&
        u.newOwnerId.trim()
      ) {
        updates.push({
          type: 'owner',
          provinceName: u.provinceName.trim(),
          newOwnerId: u.newOwnerId.trim(),
        });
      }

      if (u.type === 'time') {
        const rawAmount = typeof u.amount === 'number' ? u.amount : Number(u.amount);
        if (Number.isFinite(rawAmount) && rawAmount >= 0) {
          updates.push({ type: 'time', amount: Math.trunc(rawAmount) });
        }
      }

      if (u.type === 'event' && typeof u.description === 'string' && u.description.trim()) {
        const rawYear = typeof u.year === 'number' ? u.year : Number(u.year);
        updates.push({
          type: 'event',
          description: u.description.trim(),
          eventType: normalizeEventType(u.eventType),
          year: Number.isFinite(rawYear) ? Math.trunc(rawYear) : safeYear,
        });
      }

      if (
        u.type === 'relation' &&
        typeof u.nationA === 'string' &&
        u.nationA.trim() &&
        typeof u.nationB === 'string' &&
        u.nationB.trim() &&
        u.nationA.trim() !== u.nationB.trim() &&
        typeof u.relationType === 'string' &&
        u.relationType.trim()
      ) {
        updates.push({
          type: 'relation',
          nationA: u.nationA.trim(),
          nationB: u.nationB.trim(),
          relationType: u.relationType.trim(),
          reason: typeof u.reason === 'string' ? u.reason.trim() : '',
        });
      }

      if (u.type === 'storyStep' && typeof u.stepId === 'string' && u.stepId.trim()) {
        updates.push({
          type: 'storyStep',
          stepId: u.stepId.trim(),
          message: typeof u.message === 'string' ? u.message.trim() : 'Story goal achieved!',
        });
      }
    }
  }

  const storySoFar =
    typeof safePayload.storySoFar === 'string' && safePayload.storySoFar.trim()
      ? safePayload.storySoFar.trim()
      : undefined;

  return { message, updates, storySoFar };
}

/**
 * Full pipeline: raw LLM text -> safe, typed turn payload. Never throws.
 *
 * On a JSON parse failure it returns a safe payload with `updates: []` and
 * `parseError: true` so the route can surface a friendly message while
 * guaranteeing the game state receives zero mutations from corrupt output.
 */
export function parseAiTurnResponse(responseText: unknown, fallbackYear: number): ParsedTurnResult {
  const candidate = extractJsonCandidate(responseText);

  if (candidate === null) {
    return {
      message:
        'The Game Master returned an unreadable response. No changes were applied — try your command again.',
      updates: [],
      parseError: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return {
      message:
        'The Game Master returned an unreadable response. No changes were applied — try your command again.',
      updates: [],
      parseError: true,
    };
  }

  return { ...sanitizeAiPayload(parsed, fallbackYear), parseError: false };
}
