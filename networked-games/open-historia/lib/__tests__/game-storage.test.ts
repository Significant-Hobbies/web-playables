import { beforeEach, describe, expect, it } from 'vitest';

import {
  localListSavedGames,
  localSaveGame,
  localLoadGame,
  restoreSavedGameState,
} from '../game-storage';
import type { GameConfig, GameState, Province } from '../types';

const STORAGE_KEY = 'open_historia_saves';

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });

  return localStorageMock;
}

function makeGameConfig(): GameConfig {
  return {
    year: 1492,
    scenario: 'Test scenario',
    playerNationId: '1',
    apiKey: '',
    provider: 'local',
    model: 'claude',
    difficulty: 'Realistic',
  };
}

describe('game-storage migrations', () => {
  beforeEach(() => {
    const localStorageMock = installLocalStorageMock();
    localStorageMock.clear();
  });

  it('migrates legacy saves to the current version', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'legacy-save',
          timestamp: 1,
          version: '2.0.0',
          gameState: {
            turn: 1492,
            players: {},
            selectedProvinceId: null,
            theme: 'classic',
            provinceOwners: [],
          },
          gameConfig: makeGameConfig(),
          logs: [],
          events: [],
        },
      ])
    );

    const saves = localListSavedGames();
    expect(saves).toHaveLength(1);
    expect(saves[0].version).toBe('3.2.0');
  });
});

describe('restoreSavedGameState', () => {
  it('restores province ownership without mutating the base province list', () => {
    const baseProvinces: Province[] = [
      {
        id: 1,
        name: 'Alpha',
        ownerId: 'ai_red',
        color: '#f00',
        feature: null,
        center: [0, 0],
        neighbors: [],
        resources: {
          population: 1,
          defense: 1,
          economy: 1,
          technology: 1,
        },
      },
      {
        id: 2,
        name: 'Beta',
        ownerId: 'ai_green',
        color: '#0f0',
        feature: null,
        center: [1, 1],
        neighbors: [],
        resources: {
          population: 1,
          defense: 1,
          economy: 1,
          technology: 1,
        },
      },
    ];

    const saved = {
      id: 'save-1',
      timestamp: 1,
      version: '3.1.0',
      gameState: {
        turn: 1492,
        players: { player: { id: 'player', name: 'Player', color: '#fff' } },
        selectedProvinceId: null,
        theme: 'classic',
        provinceOwners: [{ id: '1', ownerId: 'player' }],
      },
      gameConfig: makeGameConfig(),
      logs: [],
      events: [],
    };

    const restored = restoreSavedGameState(saved as never, baseProvinces);

    expect(restored.provinces[0].ownerId).toBe('player');
    expect(restored.provinces[1].ownerId).toBe('ai_green');
    expect(baseProvinces[0].ownerId).toBe('ai_red');
  });
});

describe('campaign state persistence', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('round trips relationships, conversations, advisor, timeline and queued orders', () => {
    const state: GameState = {
      turn: 1940,
      players: {},
      provinces: [],
      selectedProvinceId: null,
      theme: 'classic',
      relations: [
        { nationA: 'Britain', nationB: 'France', type: 'friendly', treaties: ['Relief access'] },
      ],
      chatThreads: [
        {
          id: 'chat',
          type: 'bilateral',
          participants: ['Britain', 'France'],
          name: 'Relief',
          messages: [],
          unreadCount: 1,
        },
      ],
      advisorHistory: [
        { id: 'advice', role: 'advisor', content: 'Prepare relief ships.', timestamp: 1 },
      ],
      currentTimelineSnapshotId: 'turn',
      timeline: [
        {
          id: 'turn',
          turnYear: 1940,
          timestamp: 1,
          description: 'Agreement',
          command: 'Negotiate',
          parentSnapshotId: null,
          gameStateSlim: { turn: 1940, provinceOwners: {}, events: [], relations: [] },
          memory: {
            storySoFar: 'Relief agreement',
            logs: [{ id: 'log', type: 'info', text: 'Relief agreed' }],
            completedStepIds: ['relief'],
            pendingOrders: [],
            chatThreads: [],
            advisorHistory: [],
          },
        },
      ],
      pendingOrders: ['Prepare ships.'],
      completedStepIds: ['relief'],
    };
    localSaveGame(state, makeGameConfig(), [], 'campaign');
    const save = localLoadGame('campaign');
    expect(save).not.toBeNull();
    expect(restoreSavedGameState(save!, [])).toEqual(state);
    save!.gameState.timeline![0].memory = { storySoFar: '', logs: null } as never;
    const recovered = restoreSavedGameState(save!, []);
    expect(recovered.timeline![0].memory).toBeUndefined();
    expect(recovered.timeline![0].id).toBe('turn');
    expect(recovered.currentTimelineSnapshotId).toBe('turn');
  });

  it('does not overwrite unreadable saved campaigns', () => {
    localStorage.setItem(STORAGE_KEY, '{damaged save data');
    expect(() =>
      localSaveGame(
        {
          turn: 1939,
          players: {},
          provinces: [],
          selectedProvinceId: null,
          theme: 'classic',
        },
        makeGameConfig(),
        [],
        'new'
      )
    ).toThrow('existing data was preserved');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{damaged save data');
  });

  it('opens older saves with empty optional campaign state', () => {
    const restored = restoreSavedGameState(
      {
        id: 'old',
        timestamp: 1,
        version: '3.1.0',
        gameConfig: makeGameConfig(),
        logs: [],
        events: [],
        gameState: {
          turn: 1939,
          players: {},
          provinceOwners: [],
          selectedProvinceId: null,
          theme: 'classic',
        },
      },
      []
    );
    expect(restored.relations).toEqual([]);
    expect(restored.timeline).toEqual([]);
    expect(restored.pendingOrders).toEqual([]);
  });
});
