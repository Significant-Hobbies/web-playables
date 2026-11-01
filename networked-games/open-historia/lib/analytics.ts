/**
 * Owner-facing analytics — the fixed 4-event funnel.
 *
 * Every fleet project uses the same four funnel events — `signup`,
 * `activated`, `core_action`, `returned` — so a single PostHog project can
 * build one cross-fleet funnel and D1/D7 retention insight. Operational
 * `foundry_*` diagnostics are a separate event class and do not join that
 * shared funnel.
 *
 * Every event carries a `project_id` property. This is what makes per-app and
 * cross-fleet views possible from one PostHog login.
 *
 * Open Historia's primary flow runs entirely in the browser, so this wrapper
 * is browser-first — it routes through `posthog-js` (`track`)
 * and no-ops on the server.
 */

import posthog from 'posthog-js';

const PROJECT = 'open-historia' as const;

type MeasurementTraffic = 'owner' | 'qa' | 'automation' | 'unclassified';
export type RestoreOutcome = 'success' | 'unavailable' | 'error';
export type RestoreOrigin = 'manual' | 'url';
export interface InitialRestoreAttempt {
  gameId: string;
  request: object;
}

export function classifyMeasurementTraffic(
  search: string,
  isAutomation: boolean
): MeasurementTraffic {
  const explicit = new URLSearchParams(search).get('measurement_traffic');
  if (explicit === 'owner' || explicit === 'qa') return explicit;
  return isAutomation ? 'automation' : 'unclassified';
}

let sessionMeasurementTraffic: MeasurementTraffic | null = null;

/** Freeze only this tab's traffic label before game actions rewrite its URL. */
export function captureMeasurementTraffic(): void {
  if (sessionMeasurementTraffic !== null || typeof window === 'undefined') return;
  sessionMeasurementTraffic = classifyMeasurementTraffic(
    window.location.search,
    window.navigator.webdriver
  );
}

function measurementTraffic(): MeasurementTraffic {
  captureMeasurementTraffic();
  return sessionMeasurementTraffic ?? 'unclassified';
}

/**
 * The product-specific action behind a `core_action` event.
 * Open Historia exists to let you steer history one turn at a time:
 *  - `turn_advanced`  — the Game Master processed a command and advanced time.
 *  - `game_started`   — a new game session was configured and begun.
 *  - `game_saved`     — the player saved a game (local or cloud).
 *  - `game_resumed`  — a saved game was successfully restored.
 */
export type CoreAction = 'turn_advanced' | 'game_started' | 'game_saved' | 'game_resumed';

/**
 * The fixed owner-facing funnel. Product-specific detail belongs in
 * `CoreAction`; operational diagnostics use the separate `foundry_*` event
 * class and do not add steps to this funnel.
 */
interface AnalyticsEventMap {
  /** First session after an account is created. */
  signup: { project_id: typeof PROJECT };
  /** The user reaches first real value — their first processed turn. */
  activated: { project_id: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project_id: typeof PROJECT; action: CoreAction };
  /** A return session by a user with prior activity. */
  returned: { project_id: typeof PROJECT };
}

export function trackEvent(event: string, properties: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    posthog.capture(event, {
      project_id: PROJECT,
      ...properties,
      measurement_traffic: measurementTraffic(),
    });
  } catch {
    // Analytics must NEVER break a user flow. Swallow and move on.
  }
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], 'project_id'>
): void {
  trackEvent(event, props);
}

/** Fire once, on the first session after an account is created. */
export function trackSignup(): void {
  emit('signup', {});
}

const ACTIVATED_KEY = 'open-historia:activated';

/**
 * Fire once, when the user first reaches real product value — their first
 * turn processed by the Game Master. De-duplicated per browser via
 * localStorage so it stays a true once-per-user milestone.
 */
export function trackActivated(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(ACTIVATED_KEY)) return;
    window.localStorage.setItem(ACTIVATED_KEY, '1');
  } catch {
    // localStorage unavailable (private mode) — fall through and still emit.
  }
  emit('activated', {});
}

/** Fire on each completion of a core product action. */
export function trackCoreAction(action: CoreAction): void {
  emit('core_action', { action });
}

/** Add a restore to the core-action funnel only when it succeeds. */
export function trackResumeResult(successful: boolean): void {
  if (successful) trackCoreAction('game_resumed');
}

/** Pass only categorical restore fields; never pass save IDs, contents, or error details. */
export function trackRestoreOutcome(outcome: RestoreOutcome, origin: RestoreOrigin): void {
  trackEvent('foundry_restore_result', { outcome, origin });
}

/** Treat repeated effects as one attempt, while allowing a new request or save to retry. */
export function isNewInitialRestoreAttempt(
  gameId: string | undefined,
  request: object,
  previous: InitialRestoreAttempt | null
): boolean {
  return Boolean(gameId && (previous?.gameId !== gameId || previous.request !== request));
}

/** Deduplicate the URL-based restore under Strict Mode's repeated effects. */
export function trackInitialResumeOnce(
  resumedGameId: string | null,
  previouslyTrackedGameId: string | null
): string | null {
  if (!resumedGameId || resumedGameId === previouslyTrackedGameId) {
    return previouslyTrackedGameId;
  }
  trackResumeResult(true);
  return resumedGameId;
}

/** Fire on session start for a user who has prior activity. */
export function trackReturned(): void {
  emit('returned', {});
}
