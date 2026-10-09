import { useCallback, useEffect, useState } from 'react';

import { trackCoreAction } from '@/lib/analytics';
import type { LogEntry } from '@/lib/game-storage';
import { autoSave, saveGame } from '@/lib/game-storage';
import type { GameConfig, GameEvent, GameState } from '@/lib/types';

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useSaveLoad(deps: {
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  logs: LogEntry[];
  events: GameEvent[];
  storySoFar: string;
  completedStepIds: string[];
  addLog: (text: string, type?: LogEntry['type']) => void;
  refreshSavedGames: () => Promise<void>;
  initialGameIdLoaded: string | null;
}) {
  const {
    gameState,
    gameConfig,
    logs,
    events,
    storySoFar,
    completedStepIds,
    addLog,
    refreshSavedGames,
    initialGameIdLoaded,
  } = deps;

  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [showSaveNotif, setShowSaveNotif] = useState(false);
  const [showSavesPanel, setShowSavesPanel] = useState(false);
  const [showPromptSettings, setShowPromptSettings] = useState(false);

  // Initialize from URL-loaded game
  useEffect(() => {
    if (initialGameIdLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentGameId(initialGameIdLoaded);
    }
  }, [initialGameIdLoaded]);

  const handleSaveGame = useCallback(async () => {
    if (!gameState || !gameConfig) return false;
    try {
      const id = currentGameId || uid();
      await saveGame(gameState, gameConfig, logs, id, events, storySoFar, completedStepIds);
      if (!currentGameId) {
        setCurrentGameId(id);
        window.history.replaceState(null, '', `/play/${encodeURIComponent(id)}`);
      }
      setLastSaveTime(Date.now());
      setShowSaveNotif(true);
      setTimeout(() => setShowSaveNotif(false), 2000);
      await refreshSavedGames();
      trackCoreAction('game_saved');
      addLog('Game saved.', 'success');
      return true;
    } catch (error) {
      addLog(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return false;
    }
  }, [
    gameState,
    gameConfig,
    logs,
    events,
    storySoFar,
    completedStepIds,
    currentGameId,
    refreshSavedGames,
    addLog,
  ]);

  const handleSaveAndExit = useCallback(async (): Promise<boolean> => {
    if (!gameState || !gameConfig) return false;
    if (!(await handleSaveGame())) return false;
    setCurrentGameId(null);
    window.history.replaceState(null, '', '/play');
    return true;
  }, [gameState, gameConfig, handleSaveGame]);

  // Set game ID when a new game starts
  const setGameId = useCallback((id: string) => {
    setCurrentGameId(id);
  }, []);

  // Load a save and set the current game ID
  const onLoadComplete = useCallback((saveId: string) => {
    setCurrentGameId(saveId);
    setShowSavesPanel(false);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!gameState || !gameConfig) return;
    autoSave(
      gameState,
      gameConfig,
      logs,
      events,
      2000,
      currentGameId || 'autosave',
      storySoFar,
      completedStepIds
    );
  }, [gameState, gameConfig, logs, events, currentGameId, storySoFar, completedStepIds]);

  return {
    currentGameId,
    setGameId,
    lastSaveTime,
    showSaveNotif,
    showSavesPanel,
    setShowSavesPanel,
    showPromptSettings,
    setShowPromptSettings,
    handleSaveGame,
    handleSaveAndExit,
    onLoadComplete,
  };
}
