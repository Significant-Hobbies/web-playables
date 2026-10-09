import React, { useMemo, useState } from 'react';

import type { DiplomaticRelation } from '@/lib/types';

interface RelationsPanelProps {
  relations: DiplomaticRelation[];
  playerNationName: string;
}

const RELATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  allied: { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-600' },
  friendly: { bg: 'bg-sky-900/40', text: 'text-sky-400', border: 'border-sky-600' },
  neutral: { bg: 'bg-slate-800/40', text: 'text-slate-400', border: 'border-slate-600' },
  hostile: { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-600' },
  war: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-600' },
  vassal: { bg: 'bg-purple-900/40', text: 'text-purple-400', border: 'border-purple-600' },
};

const RELATION_ORDER = ['war', 'hostile', 'allied', 'friendly', 'vassal', 'neutral'];

export default function RelationsPanel({ relations, playerNationName }: RelationsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showNeutral, setShowNeutral] = useState(false);

  const nonNeutralCount = relations.filter((r) => r.type !== 'neutral').length;

  const sortedRelations = useMemo(() => {
    const isPlayerRelation = (r: DiplomaticRelation) =>
      r.nationA === playerNationName ||
      r.nationB === playerNationName ||
      r.nationA === 'player' ||
      r.nationB === 'player';

    const filtered = showNeutral ? relations : relations.filter((r) => r.type !== 'neutral');

    return [...filtered].sort((a, b) => {
      const aPlayer = isPlayerRelation(a) ? 0 : 1;
      const bPlayer = isPlayerRelation(b) ? 0 : 1;
      if (aPlayer !== bPlayer) return aPlayer - bPlayer;

      const aOrder = RELATION_ORDER.indexOf(a.type) ?? 99;
      const bOrder = RELATION_ORDER.indexOf(b.type) ?? 99;
      return aOrder - bOrder;
    });
  }, [relations, playerNationName, showNeutral]);

  const resolveNationName = (name: string) => {
    if (name === 'player') return playerNationName;
    return name;
  };

  const isPlayerRelation = (r: DiplomaticRelation) =>
    r.nationA === playerNationName ||
    r.nationB === playerNationName ||
    r.nationA === 'player' ||
    r.nationB === 'player';

  if (relations.length === 0) return null;

  return (
    <div className="font-mono text-xs select-none">
      {/* Collapsed Tab */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 backdrop-blur hover:bg-slate-800/90 transition-colors w-full"
      >
        <span className="text-slate-400 text-[10px] uppercase tracking-wider">Relations</span>
        {nonNeutralCount > 0 && (
          <span className="bg-amber-700/60 text-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {nonNeutralCount}
          </span>
        )}
        <span className="ml-auto text-slate-500">{expanded ? '\u25BC' : '\u25B2'}</span>
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="mt-1 bg-slate-900/95 border border-slate-700 rounded-lg backdrop-blur shadow-xl overflow-hidden animate-slide-up">
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {sortedRelations.map((rel, idx) => {
              const colors = RELATION_COLORS[rel.type] || RELATION_COLORS.neutral;
              const isPlayer = isPlayerRelation(rel);

              return (
                <div
                  key={`${rel.nationA}-${rel.nationB}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded ${isPlayer ? 'bg-amber-950/20 border border-amber-900/30' : 'border border-transparent'} animate-slide-in-left`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <span
                    className={`${isPlayer ? 'text-amber-200' : 'text-slate-300'} truncate flex-1`}
                  >
                    {resolveNationName(rel.nationA)}
                  </span>
                  <span className="text-slate-600 shrink-0">{'\u2194'}</span>
                  <span
                    className={`${isPlayer ? 'text-amber-200' : 'text-slate-300'} truncate flex-1 text-right`}
                  >
                    {resolveNationName(rel.nationB)}
                  </span>
                  <span
                    className={`shrink-0 ${colors.bg} ${colors.text} border ${colors.border} text-[9px] uppercase font-bold px-1.5 py-0.5 rounded`}
                  >
                    {rel.type}
                  </span>
                </div>
              );
            })}

            {sortedRelations.length === 0 && (
              <div className="text-slate-500 text-center py-2">No active relations</div>
            )}
          </div>

          {/* Footer controls */}
          <div className="border-t border-slate-800 px-2 py-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowNeutral(!showNeutral)}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showNeutral ? 'Hide neutral' : 'Show neutral'}
            </button>
            <span className="text-[10px] text-slate-600">{relations.length} total</span>
          </div>
        </div>
      )}
    </div>
  );
}
