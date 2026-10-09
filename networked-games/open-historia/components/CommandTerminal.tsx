import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { LogEntry } from '@/lib/game-storage';

interface CommandTerminalProps {
  logs: LogEntry[];
  onCommand: (cmd: string) => void;
  processing?: boolean;
}

const COMMAND_SUGGESTIONS = [
  'Declare war on',
  'Send trade offer to',
  'Form alliance with',
  'Send diplomatic message to',
  'Build military units',
  'Develop infrastructure',
  'Research technology',
  'Wait / Advance Time by',
];

function loadCommandHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('oh_command_history');
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function CommandTerminal({ logs, onCommand, processing }: CommandTerminalProps) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>(() => loadCommandHistory());
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(logs.length);

  // Track which logs are "new" (appended since last render) for entry animations
  const newLogStartIndex = prevLogCountRef.current;
  useEffect(() => {
    prevLogCountRef.current = logs.length;
  }, [logs.length]);

  useEffect(() => {
    const viewport = logViewportRef.current;
    viewport?.scrollTo({ top: logs.length ? viewport.scrollHeight : 0, behavior: 'smooth' });
  }, [logs]);

  // Derived state for suggestions
  const filteredSuggestions = useMemo(() => {
    if (input.trim().length === 0) return COMMAND_SUGGESTIONS;
    return COMMAND_SUGGESTIONS.filter((cmd) => cmd.toLowerCase().includes(input.toLowerCase()));
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add to history
    const newHistory = [input, ...commandHistory.filter((cmd) => cmd !== input)].slice(0, 50);
    setCommandHistory(newHistory);
    try {
      localStorage.setItem('oh_command_history', JSON.stringify(newHistory));
    } catch {
      // History is best-effort only; command submission should never fail here.
    }

    onCommand(input);
    setInput('');
    setHistoryIndex(-1);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab always opens/cycles suggestions — prevent browser focus switch
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!showSuggestions || filteredSuggestions.length === 0) {
        // Open suggestions and select the first one
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
      } else if (e.shiftKey) {
        setSelectedSuggestionIndex((prev) =>
          prev === 0 ? filteredSuggestions.length - 1 : prev - 1
        );
      } else {
        setSelectedSuggestionIndex((prev) => (prev + 1) % filteredSuggestions.length);
      }
      return;
    }

    // Enter accepts a highlighted suggestion, or submits the form
    if (e.key === 'Enter' && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault();
      setInput(filteredSuggestions[selectedSuggestionIndex]);
      setShowSuggestions(false);
      return;
    }

    // Escape closes suggestions
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }

    // Navigate command history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev === 0 ? filteredSuggestions.length - 1 : prev - 1
        );
      } else {
        if (commandHistory.length === 0) return;
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
        setShowSuggestions(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        setSelectedSuggestionIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else {
        if (historyIndex <= 0) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className="campaign-terminal relative w-[32rem] max-w-[90vw] h-64 bg-slate-950/90 border border-slate-700 rounded-lg shadow-2xl flex flex-col font-mono text-sm overflow-hidden backdrop-blur-md">
      {/* Log Display */}
      <div
        ref={logViewportRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {logs.length === 0 && (
          <div className="text-slate-500 italic">History awaits your command...</div>
        )}
        {/* eslint-disable-next-line react-hooks/refs */}
        {logs.map((log, idx) => {
          const isNew = idx >= newLogStartIndex;
          const staggerDelay = isNew ? `${(idx - newLogStartIndex) * 50}ms` : undefined;
          const entryAnim = isNew ? 'animate-slide-in-left' : '';
          const flashAnim =
            isNew && (log.type === 'capture' || log.type === 'war' || log.type === 'crisis')
              ? 'animate-flash-border'
              : '';

          if (log.type === 'capture') {
            return (
              <div
                key={log.id}
                className={`px-2 py-1.5 rounded bg-amber-900/30 border-l-2 border-amber-500 ${entryAnim} ${flashAnim}`}
                style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
              >
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                  TERRITORY CAPTURED
                </span>
                <div className="text-amber-200 font-bold mt-0.5">{log.text}</div>
              </div>
            );
          }
          if (log.type === 'war') {
            return (
              <div
                key={log.id}
                className={`px-2 py-1 rounded bg-red-950/30 border-l-2 border-red-500 ${entryAnim} ${flashAnim}`}
                style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
              >
                <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider mr-1">
                  WAR
                </span>
                <span className="text-red-300">{log.text}</span>
              </div>
            );
          }
          if (log.type === 'diplomacy') {
            return (
              <div
                key={log.id}
                className={`px-2 py-1 rounded bg-sky-950/30 border-l-2 border-sky-500 ${entryAnim}`}
                style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
              >
                <span className="text-sky-400 font-bold text-[10px] uppercase tracking-wider mr-1">
                  DIPLOMACY
                </span>
                <span className="text-sky-200">{log.text}</span>
              </div>
            );
          }
          if (log.type === 'economy') {
            return (
              <div
                key={log.id}
                className={`px-2 py-1 rounded bg-emerald-950/30 border-l-2 border-emerald-500 ${entryAnim}`}
                style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
              >
                <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider mr-1">
                  ECONOMY
                </span>
                <span className="text-emerald-200">{log.text}</span>
              </div>
            );
          }
          if (log.type === 'crisis') {
            return (
              <div
                key={log.id}
                className={`px-2 py-1.5 rounded bg-purple-950/30 border-l-2 border-purple-500 ${entryAnim} ${flashAnim}`}
                style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
              >
                <span className="text-purple-400 font-bold text-[10px] uppercase tracking-wider mr-1">
                  CRISIS
                </span>
                <span className="text-purple-200 font-bold">{log.text}</span>
              </div>
            );
          }
          if (log.type === 'event-summary') {
            let offset = 0;
            const lines = log.text.split('\n').map((line) => {
              const entry = { line, offset };
              offset += line.length + 1;
              return entry;
            });
            return (
              <div
                key={log.id}
                className={`px-2 py-2 rounded bg-slate-800/50 border border-slate-700 mt-1 ${entryAnim}`}
                style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
              >
                {lines.map(({ line, offset }) => (
                  <div
                    key={`${log.id}-${offset}`}
                    className={
                      offset === 0
                        ? 'text-amber-500 font-bold text-[10px] uppercase tracking-wider mb-1'
                        : 'text-slate-300 text-xs'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div
              key={log.id}
              className={`${log.type === 'command' ? 'text-slate-400 font-bold' : ''} ${log.type === 'info' ? 'text-slate-300' : ''} ${log.type === 'error' ? 'text-red-400' : ''} ${log.type === 'success' ? 'text-emerald-400' : ''} ${entryAnim}`}
              style={staggerDelay ? { animationDelay: staggerDelay } : undefined}
            >
              {log.type === 'command' && <span className="mr-2 text-slate-600">&gt;</span>}
              {log.text}
            </div>
          );
        })}

        {/* Processing shimmer bar */}
        {processing && (
          <div className="flex items-center gap-2 px-2 py-1.5 animate-slide-in-left">
            <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full w-full animate-shimmer rounded-full" />
            </div>
            <span className="text-amber-500 text-[10px] uppercase tracking-wider">Processing</span>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-12 left-2 right-2 w-auto bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl backdrop-blur-md max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, idx) => (
            <button
              type="button"
              key={suggestion}
              className={`w-full text-left px-4 py-2 cursor-pointer transition-colors ${
                idx === selectedSuggestionIndex
                  ? 'bg-amber-700/50 text-amber-200'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => {
                setInput(suggestion);
                setShowSuggestions(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-2 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-bold animate-pulse">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestionIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 focus:ring-0"
            placeholder="Enter orders (↑↓ history, Tab suggestions, Enter send)"
          />
        </div>
      </form>
    </div>
  );
}
