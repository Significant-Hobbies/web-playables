import React, { useState } from 'react';

import type { Player, Province } from '@/lib/types';

interface SidebarProps {
  province: Province | null;
  owner: Player | undefined;
  onSendMessage: (provinceId: string | number, message: string) => void;
}

export default function Sidebar({ province, owner, onSendMessage }: SidebarProps) {
  const [message, setMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!province || !message.trim()) return;
    onSendMessage(province.id, message);
    setMessage('');
  };

  if (!province) {
    return (
      <div className="absolute top-4 right-4 w-72 bg-slate-900/90 text-slate-200 p-6 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md pointer-events-none select-none">
        <h2 className="text-xl font-serif font-bold text-amber-500 mb-2">Diplomatic Channels</h2>
        <p className="text-sm text-slate-400">
          Select a nation on the map to open a secure line of communication.
        </p>
      </div>
    );
  }

  // Determine status color
  const isPlayerOwned = owner?.id === 'player';
  const statusColor = isPlayerOwned ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-900/95 text-slate-100 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="p-6 bg-slate-800/50 border-b border-slate-700">
        <h2 className="text-2xl font-serif font-bold text-white mb-1">{province.name}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isPlayerOwned ? 'bg-blue-500' : 'bg-slate-500'}`}
            ></div>
            <span className={`text-sm font-bold tracking-wide uppercase ${statusColor}`}>
              {isPlayerOwned ? 'Territory' : 'Foreign Power'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
            <span className="text-xs font-bold text-slate-500 uppercase">Population</span>
            <p className="text-lg font-mono text-slate-200">
              {province.resources.population.toLocaleString()}M
            </p>
          </div>
          <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
            <span className="text-xs font-bold text-slate-500 uppercase">Defenses</span>
            <p className="text-lg font-mono text-slate-200">Level {province.resources.defense}</p>
          </div>
        </div>

        {/* Context / State */}
        <div className="p-3 bg-slate-800/30 rounded border border-slate-700 text-sm text-slate-300 italic">
          &quot;Current intelligence suggests a state of{' '}
          {province.resources.defense > 7 ? 'high alert' : 'peace'}.&quot;
        </div>
      </div>

      {/* Diplomatic Interface */}
      <div className="flex-1 p-6 bg-slate-950/30 border-t border-slate-800 flex flex-col">
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">
          {isPlayerOwned ? 'Internal Directive' : 'Secure Channel'}
        </h3>

        <form onSubmit={handleSend} className="flex flex-col gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
            placeholder={
              isPlayerOwned
                ? 'Issue a decree to this region...'
                : `Compose a message to ${province.name}...`
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded transition-colors"
          >
            Transmit
          </button>
        </form>
      </div>
    </div>
  );
}
