import React from 'react';

import type { Player, Province } from '@/lib/types';

interface GlobeTooltipProps {
  province: Province | null;
  owner?: Player;
  position: { x: number; y: number };
  visible: boolean;
}

export default function GlobeTooltip({ province, owner, position, visible }: GlobeTooltipProps) {
  if (!visible || !province) return null;

  const isRight = typeof window !== 'undefined' && position.x > window.innerWidth - 280;
  const isBottom = typeof window !== 'undefined' && position.y > window.innerHeight - 220;

  const xOffset = isRight ? 'calc(-100% - 16px)' : '16px';
  const yOffset = isBottom ? 'calc(-100% - 16px)' : '16px';

  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    transform: `translate(${xOffset}, ${yOffset})`,
    pointerEvents: 'none',
    zIndex: 60,
  };

  const isPlayerOwned = owner?.id === 'player';

  return (
    <div
      className="flex flex-col gap-1.5 p-3.5 bg-slate-950/92 border border-slate-600/60 backdrop-blur-lg rounded-xl shadow-2xl text-slate-100 min-w-[210px] max-w-[280px]"
      style={style}
    >
      {/* Province Name with accent bar */}
      <div className="flex items-center gap-2.5 border-b border-slate-700/70 pb-2 mb-0.5">
        <div
          className="w-1 h-8 rounded-full shrink-0"
          style={{
            backgroundColor: owner?.color || '#64748b',
            boxShadow: `0 0 8px ${owner?.color || '#64748b'}60`,
          }}
        />
        <div className="min-w-0">
          <h3 className="font-bold text-base leading-tight text-white truncate">{province.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                isPlayerOwned
                  ? 'bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.6)]'
                  : owner
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
              }`}
            />
            <span className="text-xs text-slate-400">
              {owner ? owner.name : 'Neutral Territory'}
            </span>
          </div>
        </div>
      </div>

      {/* Resource Stats Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
          <div className="text-slate-500 uppercase tracking-wider text-[9px] font-sans font-semibold mb-0.5">
            Population
          </div>
          <div className="text-emerald-400 font-semibold text-sm">
            {province.resources.population >= 1000000
              ? `${(province.resources.population / 1000000).toFixed(1)}M`
              : province.resources.population >= 1000
                ? `${(province.resources.population / 1000).toFixed(0)}K`
                : province.resources.population.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
          <div className="text-slate-500 uppercase tracking-wider text-[9px] font-sans font-semibold mb-0.5">
            Defense
          </div>
          <div className="text-rose-400 font-semibold text-sm">{province.resources.defense}</div>
        </div>
        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
          <div className="text-slate-500 uppercase tracking-wider text-[9px] font-sans font-semibold mb-0.5">
            Economy
          </div>
          <div className="text-sky-400 font-semibold text-sm">{province.resources.economy}</div>
        </div>
        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
          <div className="text-slate-500 uppercase tracking-wider text-[9px] font-sans font-semibold mb-0.5">
            Technology
          </div>
          <div className="text-violet-400 font-semibold text-sm">
            {province.resources.technology}
          </div>
        </div>
      </div>

      {/* Subtle hint */}
      <div className="text-[10px] text-slate-600 text-center mt-0.5 font-sans">Click to select</div>
    </div>
  );
}
