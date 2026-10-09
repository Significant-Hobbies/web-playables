import { useCallback, useState } from 'react';

import { loadPromptOverrides } from '@/components/PromptSettings';
import type {
  ChatMessage,
  ChatThread,
  DiplomaticRelation,
  GameConfig,
  GameEvent,
  GameState,
} from '@/lib/types';

const MAX_MESSAGES_PER_THREAD = 100;

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useDiplomacy(deps: {
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  relations: DiplomaticRelation[];
  setRelations: React.Dispatch<React.SetStateAction<DiplomaticRelation[]>>;
  events: GameEvent[];
}) {
  const { gameState, gameConfig, relations, setRelations, events } = deps;

  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [processingChat, setProcessingChat] = useState(false);

  const handleCreateThread = useCallback(
    (type: 'bilateral' | 'group', participantIds: string[], name?: string) => {
      const threadName = name || participantIds.join(', ');
      const existing = chatThreads.find(
        (t) =>
          t.type === type &&
          t.participants.length === participantIds.length + 1 &&
          participantIds.every((p) => t.participants.includes(p))
      );
      if (existing) return;

      const newThread: ChatThread = {
        id: uid(),
        type,
        participants: ['player', ...participantIds],
        name: threadName,
        messages: [],
        unreadCount: 0,
      };
      setChatThreads((prev) => [...prev, newThread]);
    },
    [chatThreads]
  );

  const handleSendChatMessage = useCallback(
    async (threadId: string, message: string) => {
      const thread = chatThreads.find((t) => t.id === threadId);
      if (!thread || !gameConfig || !gameState) return;

      setProcessingChat(true);

      const playerMsg: ChatMessage = {
        id: uid(),
        senderId: 'player',
        senderName: gameState.players['player'].name,
        content: message,
        timestamp: Date.now(),
        turnYear: gameState.turn,
      };

      setChatThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          const msgs = [...t.messages, playerMsg];
          return {
            ...t,
            messages:
              msgs.length > MAX_MESSAGES_PER_THREAD ? msgs.slice(-MAX_MESSAGES_PER_THREAD) : msgs,
          };
        })
      );

      try {
        const targetNation = thread.participants.find((p) => p !== 'player') || thread.name;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            playerNation: gameState.players['player'].name,
            targetNation,
            chatHistory: thread.messages.slice(-20).map((m) => ({
              sender: m.senderName,
              content: m.content,
              turnYear: m.turnYear,
            })),
            gameContext: {
              year: gameState.turn,
              scenario: gameConfig.scenario,
              difficulty: gameConfig.difficulty,
            },
            relations:
              relations.find(
                (r) =>
                  (r.nationA === 'player' && r.nationB === targetNation) ||
                  (r.nationB === 'player' && r.nationA === targetNation)
              ) || null,
            recentEvents: events
              .slice(-10)
              .map((e) => ({ year: e.year, description: e.description })),
            config: gameConfig,
            promptOverrides: loadPromptOverrides(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Diplomacy request failed (${res.status})`);
        }

        const data = await res.json();

        const aiMsg: ChatMessage = {
          id: uid(),
          senderId: targetNation,
          senderName: targetNation,
          content: data.message || '...',
          timestamp: Date.now(),
          turnYear: gameState.turn,
          tone: data.tone || 'neutral',
        };

        setChatThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            const msgs = [...t.messages, aiMsg];
            return {
              ...t,
              messages:
                msgs.length > MAX_MESSAGES_PER_THREAD ? msgs.slice(-MAX_MESSAGES_PER_THREAD) : msgs,
            };
          })
        );

        if (data.relationChange) {
          const rel: DiplomaticRelation = {
            nationA: gameState.players['player'].name,
            nationB: targetNation,
            type: data.relationChange.newType || 'neutral',
            treaties: [],
          };
          setRelations((prev) => {
            const filtered = prev.filter(
              (r) =>
                !(
                  (r.nationA === rel.nationA && r.nationB === rel.nationB) ||
                  (r.nationA === rel.nationB && r.nationB === rel.nationA)
                )
            );
            return [...filtered, rel];
          });
        }
      } catch (err) {
        console.error(err);
        const errMsg: ChatMessage = {
          id: uid(),
          senderId: 'system',
          senderName: 'System',
          content: 'Communication channel disrupted. Try again.',
          timestamp: Date.now(),
          turnYear: gameState.turn,
          tone: 'hostile',
        };
        setChatThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, errMsg] } : t))
        );
      } finally {
        setProcessingChat(false);
      }
    },
    [chatThreads, gameConfig, gameState, relations, events, setRelations]
  );

  return {
    chatThreads,
    setChatThreads,
    processingChat,
    handleCreateThread,
    handleSendChatMessage,
  };
}
