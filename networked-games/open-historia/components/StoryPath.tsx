import React, { useEffect, useRef, useState } from 'react';
import type { StoryPath as StoryPathData } from '@/lib/types';
import { PRESETS } from '@/lib/presets';

interface StoryPathProps {
  storyPath: StoryPathData;
  completedStepIds: string[];
}

export default function StoryPath({ storyPath, completedStepIds }: StoryPathProps) {
  const [minimized, setMinimized] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Determine current step: first step that isn't completed
  const currentStep =
    storyPath.steps.find((step) => !completedStepIds.includes(step.id)) ||
    storyPath.steps[storyPath.steps.length - 1];

  const currentStepIndex = storyPath.steps.findIndex((s) => s.id === currentStep.id);
  const progress = (currentStepIndex / storyPath.steps.length) * 100;
  const previousStep = currentStepIndex > 0 ? storyPath.steps[currentStepIndex - 1] : null;
  const allDone = completedStepIds.length >= storyPath.steps.length;

  // Flash a transition animation when active step advances
  const prevStepIdRef = useRef<string | null>(null);
  const [stepJustChanged, setStepJustChanged] = useState(false);
  useEffect(() => {
    if (prevStepIdRef.current && prevStepIdRef.current !== currentStep.id) {
      setStepJustChanged(true);
      const t = setTimeout(() => setStepJustChanged(false), 700);
      prevStepIdRef.current = currentStep.id;
      return () => clearTimeout(t);
    }
    prevStepIdRef.current = currentStep.id;
  }, [currentStep.id]);

  if (storyPath.steps.length === 0) {
    return null;
  }

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="campaign-story fixed top-20 left-2 sm:left-4 z-40 px-3 py-2 bg-slate-900/90 border border-amber-500/30 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-2 hover:bg-slate-800 transition-colors group max-w-[calc(100vw-1rem)]"
      >
        <span className="text-amber-400 text-sm">{'\u270E'}</span>
        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest group-hover:text-amber-200">
          Story: {storyPath.name}
        </span>
      </button>
    );
  }

  return (
    <div className="campaign-story fixed top-20 left-2 sm:left-4 z-40 w-[min(18rem,calc(100vw-1rem))] bg-slate-950/90 border border-amber-900/40 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden font-mono">
      {/* Header */}
      <div className="bg-amber-900/20 px-3 py-2 border-b border-amber-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">{'\u270E'}</span>
          <span className="text-amber-200 font-bold text-[10px] uppercase tracking-wider">
            Guided Story
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="text-slate-500 hover:text-amber-400 transition-colors"
        >
          {'\u2014'}
        </button>
      </div>

      <div className="campaign-story-body p-3">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-slate-100 font-serif font-bold text-sm truncate">{storyPath.name}</h3>
          <span className="text-slate-500 text-[9px] uppercase tracking-wider shrink-0 ml-2">
            {completedStepIds.length}/{storyPath.steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full bg-amber-500 transition-all duration-500 ${stepJustChanged ? 'animate-pulse' : ''}`}
            style={{ width: `${allDone ? 100 : progress}%` }}
          />
        </div>

        {/* Just-completed step context (only when a previous step exists) */}
        {previousStep && completedStepIds.includes(previousStep.id) && (
          <div
            className={`mb-2 flex items-center gap-1.5 text-[9px] text-emerald-400/80 ${stepJustChanged ? 'animate-slide-down' : ''}`}
            title={previousStep.description}
          >
            <span className="text-emerald-500">✓</span>
            <span className="uppercase tracking-wider">Done:</span>
            <span className="text-slate-300 truncate">{previousStep.title}</span>
          </div>
        )}

        {/* Current Step */}
        <div
          key={currentStep.id}
          className={`bg-slate-900/50 border rounded-lg p-2.5 transition-all duration-500 ${
            stepJustChanged
              ? 'border-amber-500/60 shadow-[0_0_18px_0_rgba(245,158,11,0.25)]'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-amber-400 font-bold text-[10px] uppercase truncate">
              {allDone ? 'Complete' : `Step ${currentStepIndex + 1}`}: {currentStep.title}
            </span>
            <span className="text-slate-600 text-[9px] shrink-0">Year {currentStep.year}</span>
          </div>

          <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
            {currentStep.description}
          </p>

          {!allDone && (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <span className="text-amber-500/80 text-[9px] uppercase tracking-tighter shrink-0 w-12">
                  Aim
                </span>
                <p className="text-amber-100/80 text-[10px] italic leading-snug flex-1">
                  {currentStep.objective}
                </p>
              </div>
              <div className="flex gap-1.5">
                <span className="text-sky-500/80 text-[9px] uppercase tracking-tighter shrink-0 w-12">
                  Hint
                </span>
                <p className="text-sky-300/80 text-[10px] leading-snug flex-1">
                  {currentStep.hint}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step list (clickable to expand into a labeled list) */}
        <button
          type="button"
          onClick={() => setShowAllSteps((v) => !v)}
          className="mt-3 w-full flex justify-between gap-1 group"
          aria-label={showAllSteps ? 'Collapse step list' : 'Expand step list'}
          aria-expanded={showAllSteps}
        >
          {storyPath.steps.map((step) => {
            const isCompleted = completedStepIds.includes(step.id);
            const isCurrent = step.id === currentStep.id;

            return (
              <div
                key={step.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-amber-500'
                    : isCurrent
                      ? 'bg-amber-500/40 group-hover:bg-amber-500/60'
                      : 'bg-slate-800 group-hover:bg-slate-700'
                }`}
                title={step.title}
              />
            );
          })}
        </button>

        {showAllSteps && (
          <ol className="mt-2 space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {storyPath.steps.map((step, i) => {
              const isCompleted = completedStepIds.includes(step.id);
              const isCurrent = step.id === currentStep.id;
              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-1.5 text-[10px] leading-snug ${
                    isCurrent ? 'text-amber-200' : isCompleted ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <span className="w-3 text-center shrink-0">
                    {isCompleted ? '✓' : isCurrent ? '▶' : i + 1}
                  </span>
                  <span className="truncate flex-1">{step.title}</span>
                  <span className="text-slate-700 text-[9px] shrink-0">{step.year}</span>
                </li>
              );
            })}
          </ol>
        )}

        {/* Source notes */}
        {storyPath.sourceNotes && (
          <p className="mt-3 text-[9px] text-slate-600 leading-snug border-t border-slate-800/60 pt-2">
            {storyPath.sourceNotes}
          </p>
        )}

        {/* Suggested next scenarios (shown when story is complete) */}
        {allDone && storyPath.suggestedNext && storyPath.suggestedNext.length > 0 && (
          <SuggestedNext ids={storyPath.suggestedNext} />
        )}
      </div>
    </div>
  );
}

function SuggestedNext({ ids }: { ids: string[] }) {
  const suggestions = ids
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter(Boolean) as import('@/lib/types').Preset[];

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 border-t border-emerald-900/40 pt-2">
      <p className="text-[9px] text-emerald-500/80 uppercase tracking-wider mb-1.5">Play next</p>
      <ul className="space-y-1.5">
        {suggestions.map((preset) => (
          <li key={preset.id} className="flex gap-1.5 items-start">
            <span className="text-emerald-500/60 text-[9px] mt-0.5 shrink-0">▸</span>
            <div className="min-w-0">
              <p className="text-slate-300 text-[10px] font-bold leading-tight truncate">
                {preset.name}
              </p>
              <p className="text-slate-600 text-[9px] leading-snug line-clamp-2">
                {preset.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[9px] text-slate-700">Start a new game to play these scenarios.</p>
    </div>
  );
}
