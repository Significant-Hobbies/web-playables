import posthog from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  captureMeasurementTraffic,
  classifyMeasurementTraffic,
  isNewInitialRestoreAttempt,
  trackInitialResumeOnce,
  trackRestoreOutcome,
  trackResumeResult,
} from '../analytics';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

describe('save resume measurement', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { search: '?measurement_traffic=qa' },
      navigator: { webdriver: false },
      history: {
        replaceState: vi.fn(() => {
          window.location.search = '';
        }),
      },
    });
    captureMeasurementTraffic();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('keeps the QA label when a successful restore rewrites the URL', () => {
    window.history.replaceState(null, '', '/play/saved-fixture');
    trackResumeResult(true);

    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith('core_action', {
      project_id: 'open-historia',
      action: 'game_resumed',
      measurement_traffic: 'qa',
    });
  });

  it('does not record an unsuccessful restore as a core action', () => {
    trackResumeResult(false);

    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('records only categorical restore outcomes and permits an explicit retry', () => {
    const firstRequest = {};
    const retryRequest = {};
    expect(isNewInitialRestoreAttempt('save-id-in-memory', firstRequest, null)).toBe(true);
    trackRestoreOutcome('error', 'url');
    trackResumeResult(false);
    expect(
      isNewInitialRestoreAttempt('save-id-in-memory', firstRequest, {
        gameId: 'save-id-in-memory',
        request: firstRequest,
      })
    ).toBe(false);

    expect(
      isNewInitialRestoreAttempt('save-id-in-memory', retryRequest, {
        gameId: 'save-id-in-memory',
        request: firstRequest,
      })
    ).toBe(true);
    trackRestoreOutcome('success', 'url');
    trackResumeResult(true);

    expect(posthog.capture).toHaveBeenNthCalledWith(1, 'foundry_restore_result', {
      project_id: 'open-historia',
      outcome: 'error',
      origin: 'url',
      measurement_traffic: 'qa',
    });
    expect(posthog.capture).toHaveBeenNthCalledWith(2, 'foundry_restore_result', {
      project_id: 'open-historia',
      outcome: 'success',
      origin: 'url',
      measurement_traffic: 'qa',
    });
    expect(posthog.capture).toHaveBeenNthCalledWith(3, 'core_action', {
      project_id: 'open-historia',
      action: 'game_resumed',
      measurement_traffic: 'qa',
    });
    expect(JSON.stringify(vi.mocked(posthog.capture).mock.calls)).not.toContain(
      'save-id-in-memory'
    );
  });

  it('tracks unavailable manual restores without adding a core action', () => {
    trackRestoreOutcome('unavailable', 'manual');

    expect(posthog.capture).toHaveBeenCalledWith('foundry_restore_result', {
      project_id: 'open-historia',
      outcome: 'unavailable',
      origin: 'manual',
      measurement_traffic: 'qa',
    });
    expect(posthog.capture).not.toHaveBeenCalledWith('core_action', expect.anything());
  });

  it('does not record a URL restore when no save loaded', () => {
    expect(trackInitialResumeOnce(null, null)).toBeNull();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('deduplicates the URL-based resume when its effect repeats', () => {
    const first = trackInitialResumeOnce('saved-fixture', null);
    const repeated = trackInitialResumeOnce('saved-fixture', first);

    expect(repeated).toBe('saved-fixture');
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it('classifies automated traffic without relying on URL parameters', () => {
    expect(classifyMeasurementTraffic('', true)).toBe('automation');
  });
});
