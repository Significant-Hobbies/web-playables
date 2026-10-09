import { useCallback, useRef, useState } from 'react';

import { loadPromptOverrides } from '@/components/PromptSettings';
import { trackActivated, trackCoreAction } from '@/lib/analytics';
import type { LogEntry } from '@/lib/game-storage';
import type { GameConfig } from '@/lib/types';
import type { DiplomaticRelation, GameEvent, GameState, TimelineSnapshot } from '@/lib/types';

const MAX_LOGS = 200;
const MAX_EVENTS = 200;

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseCustomYearDelta(input: string): number {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return 0;
  const match = trimmed.match(/(\d+(?:\.\d+)?)\s*(years?|y|months?|m|days?|d)\b/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const unit = match[2][0];
  if (unit === 'y') return Math.trunc(amount);
  if (unit === 'm') return Math.trunc(amount / 12);
  return 0;
}

export function useTurnProcessing(deps: {
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  relations: DiplomaticRelation[];
  setRelations: React.Dispatch<React.SetStateAction<DiplomaticRelation[]>>;
  timelineSnapshots: TimelineSnapshot[];
  captureContext: () => Pick<
    NonNullable<TimelineSnapshot['memory']>,
    'chatThreads' | 'advisorHistory'
  >;
  setTimelineSnapshots: React.Dispatch<React.SetStateAction<TimelineSnapshot[]>>;
}) {
  const {
    gameState,
    gameConfig,
    setGameState,
    relations,
    setRelations,
    setTimelineSnapshots,
    captureContext,
  } = deps;

  const [processingTurn, setProcessingTurn] = useState(false);
  const turnInFlight = useRef(false);
  const [pendingOrders, setPendingOrders] = useState<string[]>([]);
  const [timeStep, setTimeStep] = useState('1m');
  const [customTime, setCustomTime] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [storySoFar, setStorySoFar] = useState('');
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => {
      const next = [...prev, { id: uid(), type, text }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  const queueOrder = useCallback(
    (cmd: string) => {
      if (!gameState || !gameConfig) return;
      addLog(cmd, 'command');
      setPendingOrders((prev) => [...prev, cmd]);
      addLog('Order queued. Click Advance to execute.', 'info');
    },
    [gameState, gameConfig, addLog]
  );

  const processCommand = useCallback(
    async (cmd: string, turnOverride?: number, submittedOrders = 0) => {
      if (!gameState || !gameConfig || turnInFlight.current) return;

      turnInFlight.current = true;

      setProcessingTurn(true);
      const turnYear = turnOverride ?? gameState.turn;
      const nextLogs = [...logs];
      const recordLog = (text: string, type: LogEntry['type'] = 'info') => {
        const entry = { id: uid(), type, text };
        nextLogs.push(entry);
        setLogs((prev) => [...prev, entry].slice(-MAX_LOGS));
      };
      const nextCompletedStepIds = [...completedStepIds];
      let nextEvents = [...events];
      let nextRelations = [...relations];

      try {
        const provinceSummary = gameState.provinces
          .filter((p) => p.ownerId !== null)
          .map((p) => ({ name: p.name, ownerId: p.ownerId }));

        const res = await fetch('/api/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: cmd,
            gameState: {
              turn: turnYear,
              players: gameState.players,
              provinces: provinceSummary,
            },
            config: gameConfig,
            history: logs.slice(-15),
            events: events.slice(-10),
            relations,
            provinceSummary,
            storySoFar,
            completedStepIds,
            promptOverrides: loadPromptOverrides(),
          }),
        });

        let data: {
          message?: string;
          updates?: unknown[];
          storySoFar?: string;
          error?: string;
        };
        try {
          data = await res.json();
        } catch {
          // Non-JSON body (e.g. an HTML error page from an upstream proxy).
          data = {};
        }

        if (!res.ok) {
          // The server already guarantees `updates` is empty on failure, so the
          // game state is never corrupted — surface a clear, retryable message.
          const reason =
            data.message ||
            data.error ||
            (res.status === 429
              ? 'Too many commands too quickly — wait a moment and retry.'
              : res.status === 504
                ? 'The Game Master took too long to respond. No changes were applied — try again.'
                : res.status === 502
                  ? 'The Game Master returned an unreadable response. No changes were applied — try again.'
                  : 'The Game Master is unavailable right now. No changes were applied — try again.');
          recordLog(reason, 'error');
          return;
        }

        // Commit time and consume only the submitted queue after a successful turn.
        let nextGameState = { ...gameState, turn: turnYear };
        setPendingOrders((prev) => prev.slice(submittedOrders));

        if (data.message) {
          recordLog(data.message, 'info');
        }

        if (typeof data.storySoFar === 'string') {
          setStorySoFar(data.storySoFar);
        }

        // Owner-facing analytics — the Game Master successfully processed a
        // turn. `activated` is de-duplicated to a once-per-user milestone.
        trackActivated();
        trackCoreAction('turn_advanced');

        let hasSignificantEvent = false;
        const turnEvents: string[] = [];

        if (data.updates) {
          data.updates.forEach((rawUpdate) => {
            const update = rawUpdate as Record<string, unknown>;
            if (update.type === 'owner') {
              const provinceName = update.provinceName as string;
              const newOwner = update.newOwnerId as string;
              const isPlayerCapture = newOwner === 'player';

              {
                const prev = nextGameState;
                const pLower = provinceName.toLowerCase();
                let target = prev.provinces.find((p) => p.name.toLowerCase() === pLower);
                if (!target) {
                  target = prev.provinces.find(
                    (p) =>
                      p.name.toLowerCase().startsWith(pLower + ' (') ||
                      p.name.replace(/\s*\(.*\)$/, '').toLowerCase() === pLower
                  );
                }
                if (!target) {
                  target = prev.provinces.find(
                    (p) => (p.parentCountryName || '').toLowerCase() === pLower && !p.isSubNational
                  );
                }
                if (target) {
                  nextGameState = {
                    ...prev,
                    provinces: prev.provinces.map((p) =>
                      p.id === target.id ? { ...p, ownerId: newOwner } : p
                    ),
                  };
                }
              }

              hasSignificantEvent = true;
              if (isPlayerCapture) {
                recordLog(`CAPTURED: ${provinceName} is now under your control!`, 'capture');
                turnEvents.push(`Captured ${provinceName}`);
              } else {
                recordLog(`${provinceName} seized by ${newOwner}`, 'war');
                turnEvents.push(`${provinceName} fell to ${newOwner}`);
              }
            }

            if (update.type === 'event') {
              const eventType = (update.eventType as string) || 'flavor';
              const newEvent: GameEvent = {
                id: uid(),
                year: (update.year as number) || turnYear,
                description: update.description as string,
                type: (eventType as GameEvent['type']) || 'flavor',
              };
              nextEvents = [...nextEvents, newEvent];

              const logType = (
                eventType === 'war'
                  ? 'war'
                  : eventType === 'diplomacy'
                    ? 'diplomacy'
                    : eventType === 'economy'
                      ? 'economy'
                      : eventType === 'crisis'
                        ? 'crisis'
                        : 'info'
              ) as LogEntry['type'];

              if (eventType !== 'flavor') {
                hasSignificantEvent = true;
                turnEvents.push(update.description as string);
              }
              recordLog(update.description as string, logType);
            }

            if (update.type === 'relation') {
              const rel: DiplomaticRelation = {
                nationA: update.nationA as string,
                nationB: update.nationB as string,
                type: (update.relationType as DiplomaticRelation['type']) || 'neutral',
                treaties: [],
              };
              nextRelations = nextRelations.filter(
                (r) =>
                  !(
                    (r.nationA === rel.nationA && r.nationB === rel.nationB) ||
                    (r.nationA === rel.nationB && r.nationB === rel.nationA)
                  )
              );
              nextRelations = [...nextRelations, rel];

              hasSignificantEvent = true;
              const relType = update.relationType as string;
              const logType = (
                relType === 'war' ? 'war' : relType === 'allied' ? 'diplomacy' : 'info'
              ) as LogEntry['type'];
              recordLog(`${update.nationA} ↔ ${update.nationB}: ${relType}`, logType);
              turnEvents.push(`${update.nationA} & ${update.nationB} now ${relType}`);
            }

            if (update.type === 'storyStep') {
              const stepId = (update as any).stepId as string;
              const msg = (update as any).message as string;
              if (!nextCompletedStepIds.includes(stepId)) nextCompletedStepIds.push(stepId);
              setCompletedStepIds(nextCompletedStepIds);
              recordLog(`STORY ACHIEVED: ${msg}`, 'success');
              hasSignificantEvent = true;
              turnEvents.push(`Story Achievement: ${msg}`);
            }
          });
        }

        const snapshotId = hasSignificantEvent ? uid() : null;
        if (snapshotId) nextGameState = { ...nextGameState, currentTimelineSnapshotId: snapshotId };
        setGameState(nextGameState);
        setEvents(nextEvents.length > MAX_EVENTS ? nextEvents.slice(-MAX_EVENTS) : nextEvents);
        setRelations(nextRelations);

        if (turnEvents.length > 0) {
          const summary = turnEvents.map((e) => `  - ${e}`).join('\n');
          recordLog(`--- Events This Period ---\n${summary}`, 'event-summary');
        }

        if (hasSignificantEvent) {
          const memory = {
            ...captureContext(),
            storySoFar: typeof data.storySoFar === 'string' ? data.storySoFar : storySoFar,
            logs: nextLogs.slice(-MAX_LOGS),
            completedStepIds: nextCompletedStepIds,
            pendingOrders: pendingOrders.slice(submittedOrders),
          };
          setTimelineSnapshots((prev) => {
            const next = [
              ...prev,
              {
                id: snapshotId!,
                turnYear,
                timestamp: Date.now(),
                description: turnEvents[0] || data.message?.slice(0, 100) || cmd.slice(0, 100),
                command: cmd,
                gameStateSlim: {
                  turn: turnYear,
                  provinceOwners: Object.fromEntries(
                    nextGameState.provinces.map((p) => [String(p.id), p.ownerId])
                  ),
                  events: nextEvents.slice(-MAX_EVENTS),
                  relations: nextRelations,
                },
                memory,
                parentSnapshotId:
                  gameState.currentTimelineSnapshotId ??
                  (prev.length > 0 ? prev[prev.length - 1].id : null),
              },
            ];
            return next.length > 50 ? next.slice(-50) : next;
          });
        }
      } catch (err) {
        console.error(err);
        addLog('Communication with HQ lost (Network Error).', 'error');
      } finally {
        turnInFlight.current = false;
        setProcessingTurn(false);
      }
    },
    [
      gameState,
      gameConfig,
      logs,
      events,
      relations,
      storySoFar,
      completedStepIds,
      addLog,
      setGameState,
      setRelations,
      setTimelineSnapshots,
      captureContext,
      pendingOrders,
    ]
  );

  const handleNextTurn = useCallback(() => {
    if (!gameState || !gameConfig || processingTurn) return;

    const period = timeStep === 'custom' ? customTime : timeStep;
    const label = period || '1 month';

    const orders = [...pendingOrders];
    const timeCmd = `Advance time by ${label}`;

    let fullCommand: string;
    if (orders.length > 0) {
      fullCommand = `ORDERS:\n${orders.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nThen ${timeCmd}.`;
    } else {
      fullCommand = `No new orders. ${timeCmd}. Describe what happens in the world.`;
    }

    const yearDelta =
      timeStep === 'custom' ? parseCustomYearDelta(customTime) : period === '1y' ? 1 : 0;
    const nextTurn = gameState.turn + yearDelta;
    processCommand(fullCommand, nextTurn, orders.length);
  }, [gameState, gameConfig, processingTurn, timeStep, customTime, pendingOrders, processCommand]);

  return {
    processingTurn,
    pendingOrders,
    setPendingOrders,
    timeStep,
    setTimeStep,
    customTime,
    setCustomTime,
    logs,
    setLogs,
    events,
    setEvents,
    storySoFar,
    setStorySoFar,
    completedStepIds,
    setCompletedStepIds,
    addLog,
    queueOrder,
    handleNextTurn,
  };
}
