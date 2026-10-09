import React from 'react';

import type { Player, Province } from '@/lib/types';

interface TooltipProps {
  province: Province;
  owner?: Player;
  position: { x: number; y: number };
}

export default function Tooltip({ province, owner, position }: TooltipProps) {
  // Simple boundary check to keep tooltip on screen
  // Assuming generic tooltip width ~220px and height ~160px for safety threshold
  const isRight = typeof window !== 'undefined' && position.x > window.innerWidth - 240;
  const isBottom = typeof window !== 'undefined' && position.y > window.innerHeight - 180;

  const xOffset = isRight ? 'calc(-100% - 15px)' : '15px';
  const yOffset = isBottom ? 'calc(-100% - 15px)' : '15px';

  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    transform: `translate(${xOffset}, ${yOffset})`,
    pointerEvents: 'none',
    zIndex: 50,
  };

  return (
    <div
      className="flex flex-col gap-1 p-3 bg-slate-900/90 border border-slate-700 backdrop-blur-sm rounded-lg shadow-xl text-slate-100 min-w-[180px] animate-in fade-in duration-200"
      style={style}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-700 pb-2 mb-1">
        <h3 className="font-bold text-lg leading-tight text-amber-500">{province.name}</h3>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Owner:</span>
        {owner ? (
          <span
            style={{ color: owner.color }}
            className="font-semibold shadow-black drop-shadow-sm"
          >
            {owner.name}
          </span>
        ) : (
          <span className="text-slate-500 italic">Neutral</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
        <div className="bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
          <div className="text-slate-500 uppercase tracking-wider text-[10px]">Pop</div>
          <div className="text-emerald-400 font-semibold">
            {(province.resources.population / 1000000).toFixed(1)}M
          </div>
        </div>
        <div className="bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
          <div className="text-slate-500 uppercase tracking-wider text-[10px]">Def</div>
          <div className="text-rose-400 font-semibold">{province.resources.defense}</div>
        </div>
      </div>
    </div>
  );
}
