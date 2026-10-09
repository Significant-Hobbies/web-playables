import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AdvisorMessage } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdvisorProps {
  messages: AdvisorMessage[];
  onAskAdvisor: (question: string) => void;
  processing: boolean;
  playerNation: string;
  currentYear: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICK_PROMPTS: {
  category: AdvisorMessage['category'];
  label: string;
  question: string;
}[] = [
  {
    category: 'military',
    label: 'Military',
    question: 'What is our current military position and what threats should I prioritize?',
  },
  {
    category: 'diplomacy',
    label: 'Diplomacy',
    question: 'Which nations should I consider allying with, and who are our biggest threats?',
  },
  {
    category: 'economy',
    label: 'Economy',
    question: 'How should I develop our economy and what resources should I focus on?',
  },
  {
    category: 'domestic',
    label: 'Domestic',
    question: 'What domestic policies should I prioritize for stability and growth?',
  },
];

const CATEGORY_COLORS: Record<
  NonNullable<AdvisorMessage['category']>,
  { badge: string; bg: string; border: string }
> = {
  military: {
    badge: 'bg-rose-700/60 text-rose-300',
    bg: 'bg-rose-950/20',
    border: 'border-rose-800/30',
  },
  diplomacy: {
    badge: 'bg-sky-700/60 text-sky-300',
    bg: 'bg-sky-950/20',
    border: 'border-sky-800/30',
  },
  economy: {
    badge: 'bg-emerald-700/60 text-emerald-300',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-800/30',
  },
  domestic: {
    badge: 'bg-violet-700/60 text-violet-300',
    bg: 'bg-violet-950/20',
    border: 'border-violet-800/30',
  },
  general: {
    badge: 'bg-amber-700/60 text-amber-300',
    bg: 'bg-amber-950/20',
    border: 'border-amber-800/30',
  },
};

const PROMPT_BUTTON_COLORS: Record<NonNullable<AdvisorMessage['category']>, string> = {
  military: 'bg-rose-800/40 hover:bg-rose-700/60 text-rose-300 border-rose-700/40',
  diplomacy: 'bg-sky-800/40 hover:bg-sky-700/60 text-sky-300 border-sky-700/40',
  economy: 'bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-300 border-emerald-700/40',
  domestic: 'bg-violet-800/40 hover:bg-violet-700/60 text-violet-300 border-violet-700/40',
  general: 'bg-amber-800/40 hover:bg-amber-700/60 text-amber-300 border-amber-700/40',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract lines that look like suggested actions (lines starting with - or *) */
function extractSuggestions(content: string): { text: string; offset: number }[] {
  const lines = content.split('\n');
  const suggestions: { text: string; offset: number }[] = [];
  let offset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('- ') || trimmed.startsWith('* ')) &&
      trimmed.length > 4 &&
      trimmed.length < 80
    ) {
      suggestions.push({ text: trimmed.slice(2).trim(), offset });
    }
    offset += line.length + 1;
  }
  return suggestions.slice(0, 4);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Advisor({
  messages,
  onAskAdvisor,
  processing,
  playerNation,
  currentYear,
}: AdvisorProps) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0 && open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value === input) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || processing) return;
    onAskAdvisor(trimmed);
    setInput('');
  }, [input, processing, onAskAdvisor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickPrompt = useCallback(
    (question: string) => {
      if (processing) return;
      onAskAdvisor(question);
    },
    [processing, onAskAdvisor]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (processing) return;
      onAskAdvisor(suggestion);
    },
    [processing, onAskAdvisor]
  );

  // -------------------------------------------------------------------------
  // Floating toggle button (visible when panel is closed)
  // -------------------------------------------------------------------------

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="campaign-advisor-toggle fixed bottom-36 right-[352px] z-40 w-12 h-12 rounded-full bg-teal-700/90 hover:bg-teal-600 border border-teal-500/40 shadow-lg shadow-teal-900/40 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 group"
        aria-label="Open Strategic Advisor"
        title="Strategic Advisor"
      >
        {/* Compass-star icon using CSS */}
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 flex items-center justify-center text-teal-100 text-lg font-serif font-bold leading-none">
            {'\u2726'}
          </div>
        </div>
        <span className="hidden max-[1099px]:inline ml-2">Strategic advisor</span>
        {/* Pulse ring */}
        {messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-teal-400 rounded-full animate-ping opacity-60" />
        )}
        {messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-teal-400 rounded-full" />
        )}
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Panel (open state)
  // -------------------------------------------------------------------------

  return (
    <div
      className={`
        campaign-advisor-panel fixed bottom-36 right-4 z-40
        w-[320px] flex flex-col
        bg-slate-950/95 border border-teal-800/50
        rounded-xl shadow-2xl shadow-black/40
        backdrop-blur-lg
        font-mono text-xs
        transition-all duration-300 ease-in-out
        ${minimized ? 'max-h-[44px] overflow-hidden' : 'max-h-[60vh]'}
      `}
      style={{ animation: 'advisorSlideIn 200ms ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-teal-400 text-sm">{'\u2726'}</span>
          <span className="text-teal-300 font-bold text-[11px] uppercase tracking-wider">
            Strategic Advisor
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-600 text-[9px] mr-2">
            {playerNation} | {currentYear}
          </span>
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-teal-400 transition-colors rounded hover:bg-slate-800"
            aria-label={minimized ? 'Expand' : 'Minimize'}
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '\u25A1' : '\u2014'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMinimized(false);
            }}
            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-slate-800"
            aria-label="Close advisor"
            title="Close"
          >
            {'\u00D7'}
          </button>
        </div>
      </div>

      {/* Body (hidden when minimized, handled by max-h overflow) */}
      {!minimized && (
        <>
          {/* Quick prompts */}
          <div className="px-3 py-2 border-b border-slate-800/60 shrink-0">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-1.5">
              Quick Analysis
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  type="button"
                  key={qp.category}
                  onClick={() => handleQuickPrompt(qp.question)}
                  disabled={processing}
                  className={`
                    px-2 py-1 rounded border text-[10px] font-semibold
                    transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                    ${PROMPT_BUTTON_COLORS[qp.category!]}
                  `}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                <div className="text-2xl mb-2">{'\u2726'}</div>
                <div className="text-[11px] text-center leading-relaxed">
                  Your advisor awaits your questions.
                  <br />
                  Ask about military, diplomacy, economy, or domestic affairs.
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const cat = msg.category || 'general';
              const catColors = CATEGORY_COLORS[cat];
              const suggestions = !isUser ? extractSuggestions(msg.content) : [];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Role label + category badge */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {!isUser && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${catColors.badge}`}
                      >
                        {cat}
                      </span>
                    )}
                    <span className="text-slate-600 text-[9px]">
                      {isUser ? 'You' : 'Advisor'} {'\u00B7'} {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`
                      max-w-[92%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap
                      ${
                        isUser
                          ? 'bg-teal-800/40 text-teal-100 border border-teal-700/40 rounded-br-sm'
                          : `${catColors.bg} text-slate-200 border ${catColors.border} rounded-bl-sm`
                      }
                    `}
                  >
                    {msg.content}
                  </div>

                  {/* Suggested action chips (advisor messages only) */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 max-w-[92%]">
                      {suggestions.map((sug) => (
                        <button
                          type="button"
                          key={`${msg.id}-${sug.offset}`}
                          onClick={() => handleSuggestionClick(sug.text)}
                          disabled={processing}
                          className="px-2 py-0.5 bg-slate-800/60 hover:bg-teal-800/40 border border-slate-700/50 hover:border-teal-600/50 text-slate-400 hover:text-teal-300 text-[9px] rounded-full transition-colors disabled:opacity-40"
                        >
                          {sug.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Processing indicator */}
            {processing && (
              <div className="flex items-start gap-2">
                <div className="px-3 py-2 bg-slate-800/40 border border-slate-700/30 rounded-lg rounded-bl-sm">
                  <div className="flex items-center gap-1.5 text-teal-400">
                    <span className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                    <span
                      className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"
                      style={{ animationDelay: '200ms' }}
                    />
                    <span
                      className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"
                      style={{ animationDelay: '400ms' }}
                    />
                    <span className="text-[10px] text-slate-500 ml-1">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-700/60 px-3 py-2 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={processing}
                rows={1}
                className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-200 text-[11px] placeholder-slate-600 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30 outline-none resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-slate-700"
                placeholder="Ask your advisor..."
                style={{ minHeight: '32px', maxHeight: '80px' }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || processing}
                className="w-8 h-8 shrink-0 flex items-center justify-center bg-teal-700/80 hover:bg-teal-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                aria-label="Send message"
              >
                {'\u203A'}
              </button>
            </div>
            <div className="text-[8px] text-slate-600 mt-1">
              Enter to send {'\u00B7'} Shift+Enter for newline
            </div>
          </div>
        </>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes advisorSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
