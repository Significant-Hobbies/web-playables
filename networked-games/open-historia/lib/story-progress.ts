import { getPresetById } from './presets';
import type { StoryPath, StoryStep } from './types';
import type { ParsedUpdate } from './turn-parser';

export function storyProgress(path: StoryPath, savedIds: unknown) {
  const saved = new Set(
    Array.isArray(savedIds) ? savedIds.filter((id) => typeof id === 'string') : []
  );
  const completed = path.steps.filter((step) => saved.has(step.id)).map((step) => step.id);
  const current = path.steps.find((step) => !completed.includes(step.id)) ?? null;
  return { completed, current, total: path.steps.length };
}

export interface StoryTurnContext {
  id: string;
  name: string;
  completedStepIds: string[];
  currentStep: StoryStep | null;
}

export function resolveStoryContext(presetId: unknown, savedIds: unknown): StoryTurnContext | null {
  const path = typeof presetId === 'string' ? getPresetById(presetId)?.storyPath : null;
  if (!path) return null;
  const progress = storyProgress(path, savedIds);
  return {
    id: path.id,
    name: path.name,
    completedStepIds: progress.completed,
    currentStep: progress.current,
  };
}

export function validateStoryUpdates(
  updates: ParsedUpdate[],
  context: StoryTurnContext | null
): ParsedUpdate[] {
  let awarded = false;
  return updates.filter((update) => {
    if (update.type !== 'storyStep') return true;
    if (awarded || !context?.currentStep || update.stepId !== context.currentStep.id) return false;
    awarded = true;
    return true;
  });
}

export function storyPrompt(context: StoryTurnContext | null): string {
  if (!context)
    return 'GUIDED STORY: None. This is a freeform campaign. Do not emit storyStep updates.';
  if (!context.currentStep)
    return `GUIDED STORY: ${context.name}. All milestones are complete. Continue the freeform campaign without storyStep updates.`;
  const step = context.currentStep;
  return `GUIDED STORY: ${context.name}
COMPLETED STEP IDS: ${JSON.stringify(context.completedStepIds)}
CURRENT STEP ID: ${step.id}
TITLE: ${step.title}
HISTORICAL ANCHOR: ${step.year} (context, not a forced outcome)
SITUATION: ${step.description}
OBJECTIVE: ${step.objective}
HINT: ${step.hint}
Adjudicate the player's orders and their actual consequences. If the narrated outcome fulfills this objective, include exactly one storyStep update with stepId "${step.id}" and explain the achievement. For an objective to respond, prepare, or attempt an action, a meaningful executed response can fulfill it even when the larger historical conflict goes badly. An order merely queued, a repeated phrase, or time passing alone is not completion. Do not require an unmentioned conquest or a guaranteed historical outcome. Never award future, invented, or already completed steps. If the objective is not fulfilled, briefly explain what remains to do in the narrative.`;
}
