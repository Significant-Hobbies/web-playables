import { describe, expect, it } from 'vitest';
import { buildGameMasterPrompt } from '../ai-prompts';
import { getPresetById } from '../presets';
import { resolveStoryContext, storyProgress, validateStoryUpdates } from '../story-progress';
import type { ParsedUpdate } from '../turn-parser';

describe('guided campaign adjudication', () => {
  it('provides the actual current objective and its identity to the game master', () => {
    const prompt = buildGameMasterPrompt({
      command: 'Begin strategic bombing of German industrial centers.',
      gameState: { turn: 1939, players: { player: { name: 'United Kingdom' } } },
      config: { presetId: 'ww2-1939', scenario: 'WWII', difficulty: 'Hardcore' },
      completedStepIds: ['unknown', 'unknown'],
    });
    expect(prompt).toContain('CURRENT STEP ID: poland-invasion');
    expect(prompt).toContain('Respond to the invasion of Poland');
    expect(prompt).toContain('COMPLETED STEP IDS: []');
    expect(prompt).toContain('even when the larger historical conflict goes badly');
  });

  it('accepts only one current achievement and retains its real consequences', () => {
    const context = resolveStoryContext('ww2-1939', []);
    const updates: ParsedUpdate[] = [
      { type: 'event', description: 'Blockade patrols depart.', eventType: 'war', year: 1939 },
      ...['invented', 'battle-of-france', 'poland-invasion', 'poland-invasion'].map((stepId) => ({
        type: 'storyStep' as const,
        stepId,
        message: 'A response is underway.',
      })),
    ];
    const accepted = validateStoryUpdates(updates, context);
    expect(accepted.map((update) => update.type)).toEqual(['event', 'storyStep']);
    expect(accepted[1]).toMatchObject({ stepId: 'poland-invasion' });
    const next = resolveStoryContext('ww2-1939', ['poland-invasion']);
    expect(next?.currentStep?.id).toBe('battle-of-france');
    expect(validateStoryUpdates(updates, next)).toEqual([updates[0], updates[2]]);
  });

  it('does not invent guidance for custom games or count corrupt saved IDs', () => {
    const path = getPresetById('ww2-1939')!.storyPath!;
    const progress = storyProgress(path, ['poland-invasion', 'poland-invasion', 'wrong-story']);
    expect(progress.completed).toEqual(['poland-invasion']);
    expect(progress.current?.id).toBe('battle-of-france');
    expect(resolveStoryContext('custom', ['poland-invasion'])).toBeNull();
    expect(
      validateStoryUpdates([{ type: 'storyStep', stepId: 'poland-invasion', message: 'No.' }], null)
    ).toEqual([]);
    expect(storyProgress({ ...path, steps: [] }, [])).toEqual({
      completed: [],
      current: null,
      total: 0,
    });
  });
});
