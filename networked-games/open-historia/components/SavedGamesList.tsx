import React, { useRef, useState } from 'react';

import { importSavedGame, loadGame, type SavedGame } from '@/lib/game-storage';

interface SavedGamesListProps {
  savedGames: SavedGame[];
  onLoad: (saveId: string) => void;
  onDelete: (saveId: string) => void;
  /** Called after a successful file import so the parent can refresh
   *  its saved-games list. Receives the imported save's id. */
  onImport?: (saveId: string) => void;
  getNationName?: (id: string) => string;
}

async function downloadSave(save: SavedGame, label: string): Promise<void> {
  const fullSave =
    'provinces' in save.gameState || 'provinceOwners' in save.gameState
      ? save
      : (await loadGame(save.id)) || save;

  // Strip API key on the way out so users can share saves without
  // leaking credentials. game-storage.ts also persists keys, so we
  // can't trust the in-memory shape here.
  const sanitizedConfig = { ...fullSave.gameConfig, apiKey: '' };
  const payload = {
    format: 'open-historia-save',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    save: { ...fullSave, gameConfig: sanitizedConfig },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const turn = 'turn' in fullSave.gameState ? fullSave.gameState.turn : '?';
  const slug = label
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  anchor.download = `open-historia-${slug || fullSave.id}-y${turn}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SavedGamesList({
  savedGames,
  onLoad,
  onDelete,
  onImport,
  getNationName,
}: SavedGamesListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const id = importSavedGame(parsed);
      onImport?.(id);
    } catch (err) {
      setImportError((err as Error).message);
      setTimeout(() => setImportError(null), 4000);
    }
  }

  if (savedGames.length === 0 && !onImport) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => void handleFile(e)}
        className="hidden"
      />
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        <h2 className="text-xs uppercase tracking-widest text-slate-600 font-bold shrink-0">
          Continue Playing
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        {onImport && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-amber-300 px-2 py-1 rounded-lg border border-slate-700/40 hover:border-amber-500/40 transition-colors shrink-0"
            title="Import a save from a JSON file"
          >
            Import…
          </button>
        )}
      </div>
      {importError && (
        <div className="mb-3 px-3 py-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-lg">
          {importError}
        </div>
      )}
      <div className="grid gap-2">
        {savedGames.map((save) => {
          const isAutosave = save.id === 'autosave';
          const turn = 'turn' in save.gameState ? save.gameState.turn : '?';
          const nation = getNationName
            ? getNationName(save.gameConfig.playerNationId)
            : save.gameConfig.playerNationId;
          const difficulty = save.gameConfig.difficulty;
          const date = new Date(save.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={save.id}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-900/60 border border-slate-700/30 rounded-xl hover:border-amber-600/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/10 transition-all duration-200 group cursor-pointer"
            >
              <button
                type="button"
                onClick={() => onLoad(save.id)}
                className="min-w-0 flex-1 flex items-center gap-3 text-left"
              >
                <span className="shrink-0 w-8 h-8 rounded-xl bg-slate-800/60 border border-slate-700/30 flex items-center justify-center">
                  {isAutosave ? (
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-sky-400/80"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                      />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-amber-400/80"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                      />
                    </svg>
                  )}
                </span>
                <span className="block min-w-0">
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="font-medium">{isAutosave ? 'Autosave' : 'Save'}</span>
                    <span className="text-slate-700">&middot;</span>
                    <span className="text-amber-400/80 truncate">{nation}</span>
                    <span className="text-slate-700">&middot;</span>
                    <span className="text-slate-400">Year {turn}</span>
                  </span>
                  <span className="block text-[11px] text-slate-600 mt-0.5 truncate">
                    {difficulty} &middot; {date} &middot; {save.gameConfig.scenario.slice(0, 80)}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void downloadSave(save, nation);
                  }}
                  className="text-[11px] text-slate-500 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-slate-800/60"
                  title="Export this save as JSON"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(save.id);
                  }}
                  className="text-xs text-slate-700 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-slate-800/60"
                  title="Delete save"
                >
                  &#x2715;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
