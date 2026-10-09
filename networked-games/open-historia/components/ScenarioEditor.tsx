import React, { lazy, Suspense } from 'react';

import { INITIAL_PLAYERS } from '@/lib/map-generator';
import type { Player, Province } from '@/lib/types';

const MapView = lazy(() => import('@/components/MapView'));

export type ScenarioValidationLevel = 'pass' | 'warn' | 'fail';

export type ScenarioValidationCheck = {
  id: string;
  label: string;
  detail: string;
  level: ScenarioValidationLevel;
};

export type ScenarioValidationResult = {
  checks: ScenarioValidationCheck[];
  canStart: boolean;
};

const CONTRACT_FIELDS = ['message', 'updates', 'storySoFar'];
const OUTPUT_CONFLICT_PATTERNS = [
  'do not return json',
  "don't return json",
  'no json',
  'markdown',
  'yaml',
  'xml',
  'html only',
  'plain text only',
  'ignore the output',
  'ignore output',
  'ignore previous',
  'ignore system',
  'system prompt',
  'developer message',
];
const SECRET_PATTERNS = ['sk-', 'api_key', 'api key', 'bearer ', 'password=', 'token='];

export function validateScenarioContract(scenario: string): ScenarioValidationResult {
  const normalized = scenario.trim();
  const lower = normalized.toLowerCase();
  const checks: ScenarioValidationCheck[] = [];

  checks.push({
    id: 'length',
    label: 'Playable context',
    detail:
      normalized.length >= 80
        ? 'Scenario has enough setup for the game master to reason about the world.'
        : normalized.length >= 30
          ? 'Add more concrete facts when possible: setting, tensions, actors, and opening crisis.'
          : 'Add at least a sentence of world context before starting.',
    level: normalized.length >= 80 ? 'pass' : normalized.length >= 30 ? 'warn' : 'fail',
  });

  const hasYearOrEra =
    /\b\d{3,4}\b/.test(normalized) ||
    /\b(ancient|medieval|modern|future|cold war|bronze age|industrial|space age)\b/i.test(
      normalized
    );
  checks.push({
    id: 'era',
    label: 'Era anchor',
    detail: hasYearOrEra
      ? 'Scenario includes a time or era anchor.'
      : 'Include a year or era so AI responses stay historically grounded.',
    level: hasYearOrEra ? 'pass' : 'warn',
  });

  const hasActors =
    /\b(empire|kingdom|republic|federation|alliance|coalition|dynasty|nation|city-state|caliphate|state)\b/i.test(
      normalized
    ) || (normalized.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g)?.length ?? 0) >= 3;
  checks.push({
    id: 'actors',
    label: 'Political actors',
    detail: hasActors
      ? 'Scenario names or implies multiple actors for diplomacy and conflict.'
      : 'Name at least two powers, factions, or alliances.',
    level: hasActors ? 'pass' : 'warn',
  });

  const conflictingTerm = OUTPUT_CONFLICT_PATTERNS.find((term) => lower.includes(term));
  checks.push({
    id: 'json-contract',
    label: 'AI JSON contract',
    detail: conflictingTerm
      ? `Remove "${conflictingTerm}" or similar instructions that could override the JSON-only game-master contract.`
      : `Compatible with the required AI fields: ${CONTRACT_FIELDS.join(', ')}.`,
    level: conflictingTerm ? 'fail' : 'pass',
  });

  const secretTerm = SECRET_PATTERNS.find((term) => lower.includes(term));
  checks.push({
    id: 'secrets',
    label: 'Secret hygiene',
    detail: secretTerm
      ? 'Scenario appears to contain a credential-like string. Keep keys in the provider field only.'
      : 'No obvious credentials detected in scenario text.',
    level: secretTerm ? 'fail' : 'pass',
  });

  return {
    checks,
    canStart: checks.every((check) => check.level !== 'fail'),
  };
}

function buildPreviewPlayers(): Record<string, Player> {
  return {
    ...INITIAL_PLAYERS,
    player: {
      ...INITIAL_PLAYERS.player,
      name: 'Selected Nation',
    },
  };
}

function buildPreviewProvinces(provinces: Province[], selectedNationId: string): Province[] {
  if (!selectedNationId) return provinces;
  const selected = provinces.find((province) => String(province.id) === selectedNationId);
  if (!selected) return provinces;
  const selectedParent = selected.parentCountryId || String(selected.id);
  return provinces.map((province) => {
    const provinceParent = province.parentCountryId || String(province.id);
    return provinceParent === selectedParent ? { ...province, ownerId: 'player' } : province;
  });
}

function getNationName(provinces: Province[], selectedNationId: string): string {
  const selected = provinces.find((province) => String(province.id) === selectedNationId);
  return selected ? selected.parentCountryName || selected.name : 'No nation selected';
}

function validationClass(level: ScenarioValidationLevel): string {
  if (level === 'pass') return 'border-emerald-700/40 bg-emerald-950/20 text-emerald-300';
  if (level === 'warn') return 'border-amber-700/40 bg-amber-950/20 text-amber-300';
  return 'border-rose-700/50 bg-rose-950/30 text-rose-300';
}

interface ScenarioEditorProps {
  provinces: Province[];
  scenario: string;
  onScenarioChange: (scenario: string) => void;
  playerNationId: string;
  onPlayerNationChange: (nationId: string) => void;
  validation: ScenarioValidationResult;
}

export default function ScenarioEditor({
  provinces,
  scenario,
  onScenarioChange,
  playerNationId,
  onPlayerNationChange,
  validation,
}: ScenarioEditorProps) {
  const previewProvinces = buildPreviewProvinces(provinces, playerNationId);
  const selectedNationName = getNationName(provinces, playerNationId);

  return (
    <section className="relative bg-[#151B2B] rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.4)] border border-gray-800">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] gap-5">
        <div className="space-y-4 min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="scenario-context" className="text-xs text-gray-400 ml-1 block">
                Historical Context
              </label>
              <span className="text-[10px] text-gray-500 font-mono">
                {scenario.trim().length} chars
              </span>
            </div>
            <textarea
              id="scenario-context"
              value={scenario}
              onChange={(event) => onScenarioChange(event.target.value)}
              className="w-full h-44 bg-[#1E2538] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-300 leading-relaxed resize-y min-h-36 shadow-inner focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Describe the world state, factions, tensions, and immediate crisis."
            />
            <p className="text-[10px] text-gray-500 mt-2 ml-1">
              Keep this as world context. The game-master route owns the required JSON output
              contract.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {validation.checks.map((check) => (
              <div
                key={check.id}
                className={`rounded-xl border px-3 py-2 ${validationClass(check.level)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide">{check.label}</span>
                  <span className="text-[10px] font-mono uppercase">{check.level}</span>
                </div>
                <p className="text-[11px] leading-snug opacity-85 mt-1">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Map Draft
              </h3>
              <p className="text-[10px] text-gray-500">
                Click a country or region to set the player nation.
              </p>
            </div>
            <div className="max-w-[48%] truncate rounded-lg border border-amber-700/30 bg-amber-950/20 px-2 py-1 text-[10px] text-amber-300">
              {selectedNationName}
            </div>
          </div>
          <div className="relative h-72 overflow-hidden rounded-xl border border-gray-700/60 bg-slate-950">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Loading map…
                </div>
              }
            >
              <MapView
                provinces={previewProvinces}
                players={buildPreviewPlayers()}
                onSelectProvince={(provinceId) =>
                  onPlayerNationChange(provinceId === null ? '' : String(provinceId))
                }
                selectedProvinceId={playerNationId || null}
                theme="blueprint"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
