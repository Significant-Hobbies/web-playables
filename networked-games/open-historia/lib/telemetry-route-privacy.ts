// PostHog adds these fields after capture(), including initial/session metadata.
const ROUTE_METADATA_KEYS = [
  '$current_url',
  '$pathname',
  '$referrer',
  '$initial_current_url',
  '$initial_pathname',
  '$initial_referrer',
  '$session_entry_url',
  '$session_entry_pathname',
  '$session_entry_referrer',
  'route',
] as const;

const PERSON_CONTAINERS = ['$set', '$set_once'] as const;

function normalizePlayRoute(value: unknown, ownOrigin: string): unknown {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value, ownOrigin);
    if (url.origin !== ownOrigin || !/^\/play\/[^/]+\/?$/.test(url.pathname)) return value;
    return /^https?:\/\//i.test(value) || value.startsWith('//')
      ? `${url.origin}/play/:id`
      : '/play/:id';
  } catch {
    return value;
  }
}

function sanitizeMetadata(
  properties: Record<string, unknown>,
  ownOrigin: string
): Record<string, unknown> {
  const sanitized = { ...properties };
  for (const key of ROUTE_METADATA_KEYS) {
    if (key in properties) sanitized[key] = normalizePlayRoute(properties[key], ownOrigin);
  }
  return sanitized;
}

function sanitizePersonContainers(
  container: Record<string, unknown>,
  ownOrigin: string
): Record<string, unknown> {
  const sanitized = { ...container };
  for (const key of PERSON_CONTAINERS) {
    const properties = container[key];
    if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
      sanitized[key] = sanitizeMetadata(properties as Record<string, unknown>, ownOrigin);
    }
  }
  return sanitized;
}

/** Run after SDK metadata assembly; inspect only known metadata/person fields. */
export function sanitizePlayRouteMetadata<T extends { properties: Record<string, unknown> }>(
  event: T | null,
  ownOrigin: string
): T | null {
  if (!event) return event;
  return {
    ...sanitizePersonContainers(event, ownOrigin),
    properties: sanitizePersonContainers(sanitizeMetadata(event.properties, ownOrigin), ownOrigin),
  } as T;
}
