import { isTimelineMemory } from '@/lib/timeline-memory';

import { useCallback, useState } from 'react';

import type { LogEntry } from '@/lib/game-storage';
import type { DiplomaticRelation, GameEvent, GameState, TimelineSnapshot } from '@/lib/types';

export function useTimeline(deps: {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setEvents: React.Dispatch<React.SetStateAction<GameEvent[]>>;
  setRelations: React.Dispatch<React.SetStateAction<DiplomaticRelation[]>>;
  restoreMemory: (memory: NonNullable<TimelineSnapshot['memory']>) => void;
  canRewind: () => boolean;
  addLog: (text: string, type?: LogEntry['type']) => void;
}) {
  const { gameState, setGameState, setEvents, setRelations, restoreMemory, canRewind, addLog } =
    deps;

  const [timelineSnapshots, setTimelineSnapshots] = useState<TimelineSnapshot[]>([]);

  const handleTimelineRewind = useCallback(
    (snapshotId: string) => {
      const snapshot = timelineSnapshots.find((s) => s.id === snapshotId);
      if (!snapshot || !gameState || !canRewind()) return false;
      if (!isTimelineMemory(snapshot.memory)) {
        addLog(
          'This older snapshot has no historical memory and cannot be rewound safely.',
          'error'
        );
        return false;
      }

      const restoredProvinces = gameState.provinces.map((p) => ({
        ...p,
        ownerId:
          snapshot.gameStateSlim.provinceOwners[String(p.id)] === undefined
            ? p.ownerId
            : snapshot.gameStateSlim.provinceOwners[String(p.id)],
      }));

      setGameState({
        ...gameState,
        currentTimelineSnapshotId: snapshot.id,
        turn: snapshot.gameStateSlim.turn,
        provinces: restoredProvinces,
      });
      restoreMemory(snapshot.memory);
      setEvents(snapshot.gameStateSlim.events);
      setRelations(snapshot.gameStateSlim.relations);
      addLog(`Rewound to Year ${snapshot.turnYear}.`, 'success');
      return true;
    },
    [
      timelineSnapshots,
      gameState,
      setGameState,
      setEvents,
      setRelations,
      restoreMemory,
      canRewind,
      addLog,
    ]
  );

  const handleTimelineBranch = useCallback(
    (snapshotId: string) => {
      if (handleTimelineRewind(snapshotId)) addLog('Created alternate timeline branch.', 'info');
    },
    [handleTimelineRewind, addLog]
  );

  return {
    timelineSnapshots,
    setTimelineSnapshots,
    handleTimelineRewind,
    handleTimelineBranch,
  };
}
