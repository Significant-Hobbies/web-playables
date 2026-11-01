import { describe, expect, it } from 'vitest';

import { sanitizePlayRouteMetadata } from '../telemetry-route-privacy';

const origin = 'https://historia.aliveville.com';
const syntheticId = 'synthetic-private-save';
const privateUrl = `${origin}/play/${syntheticId}?private=example#private-fragment`;

describe('PostHog play-route metadata privacy', () => {
  it('normalizes SDK, initial, session and explicit route fields without mutating input', () => {
    const event = {
      event: 'foundry_restore_result',
      properties: {
        project_id: 'open-historia',
        outcome: 'success',
        origin: 'url',
        action: 'game_resumed',
        measurement_traffic: 'qa',
        $current_url: privateUrl,
        $pathname: `/play/${syntheticId}`,
        $referrer: privateUrl,
        $initial_current_url: privateUrl,
        $initial_pathname: `/play/${syntheticId}`,
        $initial_referrer: privateUrl,
        $session_entry_url: privateUrl,
        $session_entry_pathname: `/play/${syntheticId}`,
        $session_entry_referrer: privateUrl,
        route: privateUrl,
        $set: { $current_url: privateUrl },
        $set_once: { $initial_current_url: privateUrl },
      },
      $set: { $referrer: privateUrl },
      $set_once: { $current_url: privateUrl, $pathname: `/play/${syntheticId}` },
    };
    const before = JSON.stringify(event);
    const sanitized = sanitizePlayRouteMetadata(event, origin)!;
    expect(JSON.stringify(sanitized)).not.toContain(syntheticId);
    expect(JSON.stringify(sanitized)).not.toContain('private=');
    expect(JSON.stringify(sanitized)).not.toContain('private-fragment');
    expect(sanitized.properties).toMatchObject({
      project_id: 'open-historia',
      outcome: 'success',
      origin: 'url',
      action: 'game_resumed',
      measurement_traffic: 'qa',
      $current_url: `${origin}/play/:id`,
      $pathname: '/play/:id',
      route: `${origin}/play/:id`,
      $set: { $current_url: `${origin}/play/:id` },
      $set_once: { $initial_current_url: `${origin}/play/:id` },
    });
    expect(sanitized.$set_once).toEqual({
      $current_url: `${origin}/play/:id`,
      $pathname: '/play/:id',
    });
    expect(JSON.stringify(event)).toBe(before);
  });

  it('keeps ordinary public routes, external referrers and unrelated payloads unchanged', () => {
    const arbitrary = { route: privateUrl };
    const event = {
      event: 'core_action',
      properties: {
        $current_url: `${origin}/about?tab=public#details`,
        $pathname: '/play',
        $referrer: 'https://example.com/play/public?query=keep',
        $initial_current_url: `${origin}/story-room`,
        arbitrary,
        route: '/privacy',
        measurement_traffic: 'qa',
      },
    };
    expect(sanitizePlayRouteMetadata(event, origin)).toEqual(event);
    expect(sanitizePlayRouteMetadata(event, origin)!.properties.arbitrary).toBe(arbitrary);
    expect(sanitizePlayRouteMetadata(null, origin)).toBeNull();
  });

  it('handles relative paths, trailing slashes, invalid values and bounded containers', () => {
    const event = {
      properties: {
        route: `/play/${syntheticId}/?private=value#fragment`,
        $pathname: 42,
        $referrer: 'http://[invalid',
        $set: null,
        $set_once: [],
        arbitrary: { nested: { $current_url: privateUrl } },
      },
    };
    expect(sanitizePlayRouteMetadata(event, origin)!.properties).toEqual({
      ...event.properties,
      route: '/play/:id',
    });
  });
});
