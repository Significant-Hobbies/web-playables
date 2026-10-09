import { describe, expect, it } from 'vitest';
import { isTimelineMemory } from '../timeline-memory';

const empty = {
  storySoFar: '',
  logs: [],
  completedStepIds: [],
  pendingOrders: [],
  chatThreads: [],
  advisorHistory: [],
};
describe('rewind memory boundary', () => {
  it('accepts explicit empty historical context', () => expect(isTimelineMemory(empty)).toBe(true));
  it.each([
    undefined,
    null,
    {},
    { ...empty, logs: null },
    { ...empty, storySoFar: 1 },
    { ...empty, pendingOrders: [null] },
    { ...empty, chatThreads: [{}] },
  ])('rejects missing or malformed memory %j', (value) => {
    expect(isTimelineMemory(value)).toBe(false);
  });
});
