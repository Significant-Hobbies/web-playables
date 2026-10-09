import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage, ChatThread, Player, Province } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DiplomacyChatProps {
  chatThreads: ChatThread[];
  provinces: Province[];
  players: Record<string, Player>;
  playerNationName: string;
  currentYear: number;
  onSendMessage: (threadId: string, message: string) => void;
  onCreateThread: (type: 'bilateral' | 'group', participantIds: string[], name?: string) => void;
  selectedProvinceId: string | number | null;
  processing: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toneBorderColor(tone?: ChatMessage['tone']): string {
  switch (tone) {
    case 'friendly':
      return 'border-emerald-500';
    case 'hostile':
      return 'border-orange-500';
    case 'threatening':
      return 'border-red-500 animate-pulse';
    case 'neutral':
    default:
      return 'border-slate-600';
  }
}

function toneDotColor(tone?: ChatMessage['tone']): string {
  switch (tone) {
    case 'friendly':
      return 'bg-emerald-400';
    case 'hostile':
      return 'bg-orange-400';
    case 'threatening':
      return 'bg-red-500 animate-pulse';
    case 'neutral':
    default:
      return 'bg-slate-500';
  }
}

function toneLabel(tone?: ChatMessage['tone']): string {
  switch (tone) {
    case 'friendly':
      return 'Friendly';
    case 'hostile':
      return 'Hostile';
    case 'threatening':
      return 'Threatening';
    case 'neutral':
    default:
      return 'Neutral';
  }
}

/** Get all notable nations from provinces that aren't the player's own nation. */
function getForeignNations(
  provinces: Province[],
  players: Record<string, Player>,
  playerNationName: string
): { id: string; name: string; color: string }[] {
  const seen = new Set<string>();
  const nations: { id: string; name: string; color: string }[] = [];

  // First add AI-owned nations
  for (const p of provinces) {
    if (p.ownerId && p.ownerId !== 'player' && !seen.has(p.ownerId)) {
      seen.add(p.ownerId);
      const player = players[p.ownerId];
      if (player) {
        nations.push({ id: player.id, name: player.name, color: player.color });
      }
    }
  }

  // Then add all named provinces as potential nations to talk to
  // (even if unowned - they represent countries you can interact with)
  for (const p of provinces) {
    if (
      p.name !== playerNationName &&
      !p.name.startsWith('Region') &&
      p.name !== 'Antarctica' &&
      !seen.has(p.name) &&
      p.resources.population > 20
    ) {
      seen.add(p.name);
      nations.push({ id: p.name, name: p.name, color: p.color });
    }
  }

  return nations.sort((a, b) => a.name.localeCompare(b.name));
}

/** Format a turn year into a display string */
function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`;
  return `${year} AD`;
}

/** Truncate a string to a max length */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

/** New Chat Modal */
function NewChatModal({
  foreignNations,
  onClose,
  onCreateThread,
}: {
  foreignNations: { id: string; name: string; color: string }[];
  onClose: () => void;
  onCreateThread: DiplomacyChatProps['onCreateThread'];
}) {
  const [mode, setMode] = useState<'bilateral' | 'group'>('bilateral');
  const [selectedNation, setSelectedNation] = useState<string>('');
  const [selectedNations, setSelectedNations] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleCreate = () => {
    if (mode === 'bilateral') {
      if (!selectedNation) return;
      onCreateThread('bilateral', [selectedNation]);
      onClose();
    } else {
      if (selectedNations.size < 1) return;
      onCreateThread('group', Array.from(selectedNations), groupName.trim() || undefined);
      onClose();
    }
  };

  const toggleNation = (id: string) => {
    setSelectedNations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center pt-12">
      <div
        ref={modalRef}
        className="w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-700">
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">
            New Channel
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setMode('bilateral')}
            className={`flex-1 text-xs font-bold uppercase py-2 transition-colors ${
              mode === 'bilateral'
                ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-800/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Bilateral
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex-1 text-xs font-bold uppercase py-2 transition-colors ${
              mode === 'group'
                ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-800/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Group
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {mode === 'bilateral' ? (
            <>
              <label
                htmlFor="diplomacy-nation"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              >
                Select Nation
              </label>
              <select
                id="diplomacy-nation"
                value={selectedNation}
                onChange={(e) => setSelectedNation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 transition-colors"
              >
                <option value="">-- Choose --</option>
                {foreignNations.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label
                htmlFor="diplomacy-channel"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              >
                Channel Name
              </label>
              <input
                id="diplomacy-channel"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. NATO Summit"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 transition-colors placeholder-slate-600"
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2 block">
                Select Nations
              </span>
              <div className="space-y-1">
                {foreignNations.map((n) => (
                  <label
                    key={n.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedNations.has(n.name)
                        ? 'bg-amber-900/30 border border-amber-700/50'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNations.has(n.name)}
                      onChange={() => toggleNation(n.name)}
                      className="sr-only"
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-600"
                      style={{ backgroundColor: n.color }}
                    />
                    <span className="text-sm text-slate-200">{n.name}</span>
                    {selectedNations.has(n.name) && (
                      <span className="ml-auto text-amber-400 text-xs">&#10003;</span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCreate}
            disabled={mode === 'bilateral' ? !selectedNation : selectedNations.size < 1}
            className="w-full py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
          >
            Open Channel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Thread List Item */
function ThreadListItem({
  thread,
  playerNationName,
  players,
  isActive,
  onClick,
}: {
  thread: ChatThread;
  playerNationName: string;
  players: Record<string, Player>;
  isActive: boolean;
  onClick: () => void;
}) {
  const lastMessage = thread.messages[thread.messages.length - 1] ?? null;

  // For bilateral threads, show the other participant's name
  const displayName =
    thread.type === 'bilateral'
      ? thread.participants.find((p) => p !== playerNationName) || thread.name
      : thread.name;

  // Find a color for the thread icon
  const otherParticipant =
    thread.type === 'bilateral' ? thread.participants.find((p) => p !== playerNationName) : null;

  // Try to find the player color by matching name
  let dotColor = '#6b7280'; // default slate-500
  if (otherParticipant) {
    const matched = Object.values(players).find((pl) => pl.name === otherParticipant);
    if (matched) dotColor = matched.color;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors border-b border-slate-800/60 group ${
        isActive ? 'bg-slate-800/70' : 'hover:bg-slate-800/40'
      }`}
    >
      {/* Icon / Color dot */}
      <div className="shrink-0 pt-0.5">
        {thread.type === 'group' ? (
          <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px] text-amber-400 font-bold">
            G
          </div>
        ) : (
          <div
            className="w-3 h-3 rounded-full mt-0.5 border border-slate-600"
            style={{ backgroundColor: dotColor }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm font-bold truncate ${
              isActive ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {displayName}
          </span>
          {thread.unreadCount > 0 && (
            <span className="shrink-0 bg-amber-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {thread.unreadCount}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            <span className="text-slate-400">{lastMessage.senderName}:</span>{' '}
            {truncate(lastMessage.content, 40)}
          </p>
        )}
        {!lastMessage && (
          <p className="text-[11px] text-slate-600 italic mt-0.5">No messages yet</p>
        )}
      </div>
    </button>
  );
}

/** Individual message bubble */
function MessageBubble({
  message,
  isOwn,
  isGroup,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isGroup: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 mb-3 animate-in slide-in-from-bottom-2 fade-in duration-300 ${
        isOwn ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender name for group chats, or for AI messages */}
      {(isGroup || !isOwn) && (
        <div className="flex items-center gap-1.5 px-1">
          {!isOwn && message.tone && (
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneDotColor(message.tone)}`}
              title={toneLabel(message.tone)}
            />
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isOwn ? 'text-amber-500/70' : 'text-slate-500'
            }`}
          >
            {message.senderName}
          </span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed border ${
          isOwn
            ? 'bg-amber-900/40 border-amber-700/40 text-amber-100 rounded-br-sm'
            : `bg-slate-800/60 ${toneBorderColor(message.tone)} text-slate-200 rounded-bl-sm`
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {/* Timestamp */}
      <span className="text-[9px] text-slate-600 px-1 font-mono">
        {formatYear(message.turnYear)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DiplomacyChat({
  chatThreads,
  provinces,
  players,
  playerNationName,
  currentYear,
  onSendMessage,
  onCreateThread,
  selectedProvinceId,
  processing,
}: DiplomacyChatProps) {
  // ----- State -----
  const [collapsed, setCollapsed] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ----- Derived -----
  const activeThread = useMemo(
    () => chatThreads.find((t) => t.id === activeThreadId) ?? null,
    [chatThreads, activeThreadId]
  );

  const sortedThreads = useMemo(() => {
    return [...chatThreads].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.timestamp ?? 0;
      const bLast = b.messages[b.messages.length - 1]?.timestamp ?? 0;
      return bLast - aLast;
    });
  }, [chatThreads]);

  const foreignNations = useMemo(
    () => getForeignNations(provinces, players, playerNationName),
    [provinces, players, playerNationName]
  );

  const totalUnread = useMemo(
    () => chatThreads.reduce((sum, t) => sum + t.unreadCount, 0),
    [chatThreads]
  );

  // Detect if the selected province on the map is a foreign nation
  // and whether a bilateral thread already exists for it.
  const selectedProvinceSuggestion = useMemo(() => {
    if (!selectedProvinceId) return null;

    const province = provinces.find((p) => p.id === selectedProvinceId);
    if (!province || province.ownerId === 'player') return null;

    // Use the owner's name if owned by AI, otherwise use province name as nation
    const owner = province.ownerId ? players[province.ownerId] : null;
    const nationName = owner?.name ?? (province.parentCountryName || province.name);

    // Skip generic/small regions
    if (province.name.startsWith('Region') || province.name === 'Antarctica') return null;

    // Check if bilateral thread already exists
    const existingThread = chatThreads.find(
      (t) =>
        t.type === 'bilateral' && (t.participants.includes(nationName) || t.name === nationName)
    );

    if (existingThread) return null;

    return {
      nationName,
      color: owner?.color ?? province.color,
    };
  }, [selectedProvinceId, provinces, players, chatThreads]);

  // ----- Effects -----

  // Auto-open newly created threads
  const prevThreadCountRef = useRef(chatThreads.length);
  useEffect(() => {
    if (chatThreads.length > prevThreadCountRef.current) {
      // A new thread was added - open it
      const newest = chatThreads[chatThreads.length - 1];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (newest) setActiveThreadId(newest.id);
    }
    prevThreadCountRef.current = chatThreads.length;
  }, [chatThreads]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (activeThread) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [activeThread, activeThread?.messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value === inputValue) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      // Clamp between 1 line (~32px) and 3 lines (~72px)
      textareaRef.current.style.height = `${Math.min(scrollH, 72)}px`;
    }
  }, [inputValue]);

  // ----- Handlers -----

  const handleSend = useCallback(() => {
    if (!activeThread || !inputValue.trim() || processing) return;
    onSendMessage(activeThread.id, inputValue.trim());
    setInputValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [activeThread, inputValue, processing, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleStartConversation = useCallback(
    (nationName: string) => {
      onCreateThread('bilateral', [nationName]);
      // Find thread once it is created (will appear next render).
      // For now, close suggestion and the parent will pass updated threads.
    },
    [onCreateThread]
  );

  // ----- Placeholder text -----
  const placeholderText = useMemo(() => {
    if (!activeThread) return 'Select a channel...';
    if (activeThread.type === 'group') {
      return `Address ${activeThread.name || 'the alliance'}...`;
    }
    const other = activeThread.participants.find((p) => p !== playerNationName);
    return `Propose terms to ${other || 'this nation'}...`;
  }, [activeThread, playerNationName]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="campaign-diplomacy absolute top-20 right-4 z-30 flex flex-col font-mono w-80 max-h-[80vh]">
      {/* ================================================================== */}
      {/* HEADER BAR                                                         */}
      {/* ================================================================== */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-t-xl hover:bg-slate-800/95 transition-colors select-none"
        style={collapsed ? { borderRadius: 12 } : undefined}
      >
        <h2 className="flex flex-1 self-stretch">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex flex-1 items-center gap-2 self-stretch text-left"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
              Diplomatic Channels
            </span>
            {totalUnread > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {totalUnread}
              </span>
            )}
          </button>
        </h2>
        <div className="flex items-center gap-2">
          {/* New Chat Button */}
          {!collapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewChat(true);
              }}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 hover:bg-amber-700 text-slate-300 hover:text-white transition-colors text-sm leading-none"
              title="New Channel"
            >
              +
            </button>
          )}
          {/* Collapse Chevron */}
          <button
            type="button"
            aria-label={collapsed ? 'Expand diplomatic channels' : 'Collapse diplomatic channels'}
            onClick={() => setCollapsed((c) => !c)}
          >
            <svg
              aria-hidden="true"
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                collapsed ? '' : 'rotate-180'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* COLLAPSIBLE BODY                                                   */}
      {/* ================================================================== */}
      {!collapsed && (
        <div className="flex flex-col bg-slate-900/95 backdrop-blur-md border-x border-b border-slate-700 rounded-b-xl overflow-hidden flex-1">
          {/* -------------------------------------------------------------- */}
          {/* THREAD LIST (when no active thread)                             */}
          {/* -------------------------------------------------------------- */}
          {!activeThread ? (
            <div
              className="flex flex-col overflow-hidden"
              style={{ maxHeight: 'calc(80vh - 52px)' }}
            >
              {/* Province suggestion banner */}
              {selectedProvinceSuggestion && (
                <div className="px-3 py-2.5 bg-amber-900/20 border-b border-amber-800/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: selectedProvinceSuggestion.color,
                      }}
                    />
                    <span className="text-[11px] text-amber-300 truncate">
                      Open channel with <strong>{selectedProvinceSuggestion.nationName}</strong>?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartConversation(selectedProvinceSuggestion.nationName)}
                    className="shrink-0 text-[10px] font-bold uppercase bg-amber-700 hover:bg-amber-600 text-white px-2 py-1 rounded transition-colors"
                  >
                    Start
                  </button>
                </div>
              )}

              {/* Thread List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {sortedThreads.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="text-slate-600 text-xs uppercase tracking-wider mb-2">
                      No Active Channels
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Select a foreign nation on the map or press{' '}
                      <span className="text-amber-500">[+]</span> to open a diplomatic channel.
                    </p>
                  </div>
                ) : (
                  sortedThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      playerNationName={playerNationName}
                      players={players}
                      isActive={false}
                      onClick={() => setActiveThreadId(thread.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* ACTIVE CHAT VIEW                                             */
            /* ============================================================ */
            <div
              className="flex flex-col overflow-hidden"
              style={{ maxHeight: 'calc(80vh - 52px)' }}
            >
              {/* Chat Header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/50 border-b border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveThreadId(null)}
                  className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
                  aria-label="Back to thread list"
                  title="Back"
                >
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider truncate">
                    {activeThread.type === 'bilateral'
                      ? activeThread.participants.find((p) => p !== playerNationName) ||
                        activeThread.name
                      : activeThread.name}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {activeThread.type === 'group'
                      ? `${activeThread.participants.length} nations`
                      : 'Bilateral Channel'}
                    {' \u00B7 '}
                    {formatYear(currentYear)}
                  </span>
                </div>
                {activeThread.type === 'group' && (
                  <div className="shrink-0 flex -space-x-1.5">
                    {activeThread.participants.slice(0, 4).map((name) => {
                      const matched = Object.values(players).find((pl) => pl.name === name);
                      return (
                        <div
                          key={name}
                          className="w-4 h-4 rounded-full border border-slate-700"
                          style={{
                            backgroundColor: matched?.color ?? '#6b7280',
                          }}
                          title={name}
                        />
                      );
                    })}
                    {activeThread.participants.length > 4 && (
                      <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[8px] text-slate-400">
                        +{activeThread.participants.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {activeThread.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                      <svg
                        aria-hidden="true"
                        className="w-5 h-5 text-slate-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                        />
                      </svg>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
                      Begin diplomatic communications. Your tone will shape the relationship.
                    </p>
                  </div>
                )}

                {activeThread.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderName === playerNationName}
                    isGroup={activeThread.type === 'group'}
                  />
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-3 py-2.5 bg-slate-950/60 border-t border-slate-800 shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText}
                    disabled={processing}
                    rows={1}
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/50 resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-snug"
                    style={{ minHeight: 32, maxHeight: 72 }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || processing}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                    title="Send"
                  >
                    {processing ? (
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Processing Indicator */}
                {processing && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <div
                        className="w-1 h-1 rounded-full bg-amber-500 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-1 h-1 rounded-full bg-amber-500 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-1 h-1 rounded-full bg-amber-500 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span className="text-[10px] text-amber-500/70">Awaiting response...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* NEW CHAT MODAL                                                     */}
      {/* ================================================================== */}
      {showNewChat && (
        <NewChatModal
          foreignNations={foreignNations}
          onClose={() => setShowNewChat(false)}
          onCreateThread={onCreateThread}
        />
      )}
    </div>
  );
}
