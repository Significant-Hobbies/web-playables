import React, { useEffect, useState } from 'react';

import {
  DEFAULT_PROMPT_OVERRIDES,
  loadPromptOverrides,
  type PromptOverrides,
  savePromptOverrides,
} from '@/lib/prompt-overrides';

export type { PromptOverrides } from '@/lib/prompt-overrides';
export { loadPromptOverrides, savePromptOverrides } from '@/lib/prompt-overrides';

const DEFAULTS = DEFAULT_PROMPT_OVERRIDES;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
}

const FIELDS: { key: keyof PromptOverrides; label: string; rows: number }[] = [
  { key: 'gameMasterPreamble', label: 'Game Master Preamble', rows: 4 },
  { key: 'adjudicationRules', label: 'Adjudication Rules', rows: 10 },
  { key: 'diplomacyInstructions', label: 'Diplomacy Instructions', rows: 5 },
  { key: 'advisorPersonality', label: 'Advisor Personality', rows: 5 },
];

export default function PromptSettings({ open, onClose }: Props) {
  const [overrides, setOverrides] = useState<PromptOverrides>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setOverrides(loadPromptOverrides());
  }, [open]);

  if (!open) return null;

  const handleChange = (key: keyof PromptOverrides, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    savePromptOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setOverrides(DEFAULTS);
    savePromptOverrides(DEFAULTS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <h2 className="text-sm uppercase tracking-wide text-slate-200 font-bold">
            Prompt Settings
          </h2>
          <div className="flex items-center gap-2">
            {saved && <span className="text-emerald-400 text-xs">Saved</span>}
            <button
              type="button"
              onClick={handleReset}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded uppercase"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Customize the AI prompt templates used by the Game Master, Diplomacy, and Advisor
            systems. Changes apply to all future AI calls. Reset to restore original prompts.
          </p>

          {FIELDS.map(({ key, label, rows }) => (
            <div key={key}>
              <label
                htmlFor={`prompt-${key}`}
                className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1"
              >
                {label}
              </label>
              <textarea
                id={`prompt-${key}`}
                value={overrides[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={rows}
                className="w-full bg-slate-800 text-slate-100 text-xs font-mono border border-slate-700 rounded px-3 py-2 outline-none focus:border-amber-600 resize-y"
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
