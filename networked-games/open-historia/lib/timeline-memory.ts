import type { TimelineSnapshot } from './types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const records = (value: unknown, valid: (item: Record<string, unknown>) => boolean) =>
  Array.isArray(value) && value.every((item) => record(item) && valid(item));
const textFields = (value: Record<string, unknown>, names: string[]) =>
  names.every((name) => typeof value[name] === 'string');
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

// Validate only the new optional rewind payload. Never manufacture missing history.
export function isTimelineMemory(value: unknown): value is NonNullable<TimelineSnapshot['memory']> {
  if (!record(value)) return false;
  return (
    typeof value.storySoFar === 'string' &&
    strings(value.completedStepIds) &&
    strings(value.pendingOrders) &&
    records(
      value.logs,
      (log) =>
        textFields(log, ['id', 'text']) &&
        [
          'command',
          'info',
          'error',
          'success',
          'capture',
          'war',
          'diplomacy',
          'economy',
          'crisis',
          'event-summary',
        ].includes(String(log.type))
    ) &&
    records(
      value.advisorHistory,
      (message) =>
        textFields(message, ['id', 'content']) &&
        ['user', 'advisor'].includes(String(message.role)) &&
        finite(message.timestamp)
    ) &&
    records(
      value.chatThreads,
      (thread) =>
        textFields(thread, ['id', 'name']) &&
        ['bilateral', 'group'].includes(String(thread.type)) &&
        strings(thread.participants) &&
        finite(thread.unreadCount) &&
        records(
          thread.messages,
          (message) =>
            textFields(message, ['id', 'senderId', 'senderName', 'content']) &&
            finite(message.timestamp) &&
            finite(message.turnYear)
        )
    )
  );
}
