import { useCallback, useState } from 'react';

import { loadPromptOverrides } from '@/components/PromptSettings';
import type { GameConfig } from '@/lib/types';
import type { AdvisorMessage, DiplomaticRelation, GameEvent, GameState } from '@/lib/types';

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useAdvisor(deps: {
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  events: GameEvent[];
  relations: DiplomaticRelation[];
}) {
  const { gameState, gameConfig, events, relations } = deps;

  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([]);
  const [processingAdvisor, setProcessingAdvisor] = useState(false);

  const handleAskAdvisor = useCallback(
    async (question: string) => {
      if (!gameConfig || !gameState) return;

      setProcessingAdvisor(true);

      const userMsg: AdvisorMessage = {
        id: uid(),
        role: 'user',
        content: question,
        timestamp: Date.now(),
      };
      setAdvisorMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch('/api/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            playerNation: gameState.players['player'].name,
            gameContext: {
              year: gameState.turn,
              scenario: gameConfig.scenario,
              difficulty: gameConfig.difficulty,
            },
            recentEvents: events.slice(-10),
            relations,
            history: advisorMessages.slice(-10).map((m) => ({
              content: m.content,
              role: m.role,
            })),
            config: gameConfig,
            promptOverrides: loadPromptOverrides(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Advisor request failed (${res.status})`);
        }

        const data = await res.json();

        const advisorMsg: AdvisorMessage = {
          id: uid(),
          role: 'advisor',
          content: data.advice || 'I need more time to analyze the situation.',
          timestamp: Date.now(),
          category: data.category || 'general',
        };
        setAdvisorMessages((prev) => [...prev, advisorMsg]);
      } catch (err) {
        console.error(err);
        setAdvisorMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'advisor',
            content: 'My intelligence networks are disrupted. Please try again.',
            timestamp: Date.now(),
            category: 'general',
          },
        ]);
      } finally {
        setProcessingAdvisor(false);
      }
    },
    [gameConfig, gameState, events, relations, advisorMessages]
  );

  return {
    advisorMessages,
    setAdvisorMessages,
    processingAdvisor,
    handleAskAdvisor,
  };
}
