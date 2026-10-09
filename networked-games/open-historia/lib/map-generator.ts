import type { Player } from './types';

export const INITIAL_PLAYERS: Record<string, Player> = {
  player: { id: 'player', name: 'You', color: '#3b82f6' }, // Blue

  ai_red: { id: 'ai_red', name: 'Red Empire', color: '#ef4444' }, // Red

  ai_green: { id: 'ai_green', name: 'Green Republic', color: '#22c55e' }, // Green

  ai_yellow: { id: 'ai_yellow', name: 'Golden Horde', color: '#eab308' }, // Yellow
};
