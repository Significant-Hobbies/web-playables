import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import CommandTerminal from '@/components/CommandTerminal';
import DiplomacyChat from '@/components/DiplomacyChat';
import GameSetup from '@/components/GameSetup';
import SavedGamesList from '@/components/SavedGamesList';
import Timeline from '@/components/Timeline';
import type { SavedGame } from '../game-storage';

// Native buttons must remain independent: nesting them makes browser parsing
// and keyboard activation differ from the React tree.
function expectIndependentButtons(markup: string) {
  let depth = 0;
  for (const match of markup.matchAll(/<button\b[^>]*>|<\/button>/g)) {
    if (match[0] === '</button>') {
      depth--;
    } else {
      expect(depth).toBe(0);
      expect(match[0]).toContain('type="button"');
      depth++;
    }
  }
  expect(depth).toBe(0);
}

describe('check baseline accessibility regressions', () => {
  it('gives setup controls names through their visible labels', () => {
    const markup = renderToStaticMarkup(
      createElement(GameSetup, { provinces: [], onStartGame: vi.fn() })
    );
    for (const [name, control] of [
      ['Provider', 'select'],
      ['Model', 'select'],
      ['Play As', 'select'],
      ['Start Year', 'input'],
      ['Historical Context', 'textarea'],
    ]) {
      const label = [...markup.matchAll(/<label\b([^>]*)>(.*?)<\/label>/g)].find(
        (match) => match[2] === name
      );
      expect(label, name).toBeDefined();
      const id = label?.[1].match(/for="([^"]+)"/)?.[1];
      expect(id, name).toBeTruthy();
      expect(markup).toMatch(new RegExp(`<${control}\\b[^>]*id="${id}"`));
    }
  });

  it('keeps load, export and delete as separate native save actions', () => {
    const save = JSON.parse(
      readFileSync('docs/qualification/layout-2026-09-09/guest-fixture.json', 'utf8')
    ) as SavedGame;
    const markup = renderToStaticMarkup(
      createElement(SavedGamesList, {
        savedGames: [save],
        onLoad: vi.fn(),
        onDelete: vi.fn(),
      })
    );
    expectIndependentButtons(markup);
    const buttons = [...markup.matchAll(/<button\b[^>]*>(.*?)<\/button>/g)];
    expect(buttons).toHaveLength(3);
    expect(buttons[0][1]).toContain(`Year ${save.gameState.turn}`);
    expect(buttons[0][1]).not.toMatch(/<div\b|<button\b/);
    expect(buttons[1][1]).toBe('Export');
    expect(markup).toContain('title="Delete save"');
  });

  it('keeps new-channel and collapse controls independent', () => {
    const markup = renderToStaticMarkup(
      createElement(DiplomacyChat, {
        chatThreads: [],
        provinces: [],
        players: {},
        playerNationName: 'United Kingdom',
        currentYear: 1939,
        selectedProvinceId: null,
        processing: false,
        onSendMessage: vi.fn(),
        onCreateThread: vi.fn(),
      })
    );
    expectIndependentButtons(markup);
    expect(markup).toContain('title="New Channel"');
    expect(markup).toContain('aria-label="Collapse diplomatic channels"');
    expect(markup).not.toContain('role="button"');
  });

  it('retains repeated summary lines and lets users choose input focus', () => {
    const markup = renderToStaticMarkup(
      createElement(CommandTerminal, {
        logs: [{ id: 'summary', type: 'event-summary', text: 'Events\nRepeated\nRepeated\n' }],
        onCommand: vi.fn(),
      })
    );
    expect(markup.match(/>Repeated<\/div>/g)).toHaveLength(2);
    expect(markup.match(/>Events<\/div>/g)).toHaveLength(1);
    expect(markup).toContain('Enter orders');
    expect(markup).not.toMatch(/autofocus/i);
  });

  it('exposes snapshot tab stops and a named, programmatically focusable timeline', () => {
    const save = JSON.parse(
      readFileSync('docs/qualification/layout-2026-09-09/guest-fixture.json', 'utf8')
    ) as SavedGame;
    const markup = renderToStaticMarkup(
      createElement(Timeline, {
        snapshots: save.gameState.timeline || [],
        currentYear: save.gameState.turn,
        onRewind: vi.fn(),
        onBranch: vi.fn(),
      })
    );
    expect(markup).toMatch(/<section\b[^>]*tabindex="-1"[^>]*aria-label="History timeline/);
    expectIndependentButtons(markup);
    expect(markup.match(/aria-label="Turn /g)?.length).toBe(save.gameState.timeline?.length);
  });
});
