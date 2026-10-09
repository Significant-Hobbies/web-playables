import React, { useEffect, useState } from 'react';
import {
  AI_PERSONAS,
  pickUnused,
  STORY_ROOM_PARTICIPANTS,
  STORY_ROOM_PROMPTS,
  suggestCoAuthorBranch,
} from '@/lib/story-room-fixtures';

// ============================================================================
// Story Room Prototype — v0.1 (StoryTunes branch archive + AI co-author)
// Isolated, local-only, no core game imports, no saves, no network.
// Submit / vote / canon + apocrypha archive with replay & revive.
// Playful ritual, deliberately not a document editor.
// ============================================================================

type Phase = 'lobby' | 'submit' | 'vote' | 'canon';

type Submission = {
  id: string;
  author: string;
  text: string;
  votes: number;
  isAI?: boolean;
};

type ArchivedBranch = {
  id: string;
  round: number;
  author: string;
  text: string;
  votes: number;
  isAI?: boolean;
  rejectedAgainst: string;
};

const PROMPTS = STORY_ROOM_PROMPTS;
const PARTICIPANTS = STORY_ROOM_PARTICIPANTS;

const MAX_CHARS = 220;

function createId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function getVerdict(winnerVotes: number, totalVotes: number, numSubs: number): string {
  if (numSubs <= 1) return 'The only telling. The scribes were of one mind.';
  const margin = winnerVotes - (totalVotes - winnerVotes);
  const share = winnerVotes / Math.max(1, totalVotes);
  if (share >= 0.8) return 'The hall roared as one. The canon was never in doubt.';
  if (share >= 0.6) return 'A clear voice carried the night. The scribes nodded.';
  if (margin > 0) return 'Narrowly carried. The hall was split but the winner emerged.';
  return 'A whisper of consensus. History is sometimes decided by the smallest margin.';
}

export default function StoryRoomPrototype() {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [promptId, setPromptId] = useState<string>(PROMPTS[0]!.id);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [personaId, setPersonaId] = useState<string>(AI_PERSONAS[0]!.id);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userVoteId, setUserVoteId] = useState<string | null>(null);
  const [runningCanon, setRunningCanon] = useState<Submission[]>([]);
  const [round, setRound] = useState(1);
  const [lastCanonized, setLastCanonized] = useState<Submission | null>(null);
  const [lastApocrypha, setLastApocrypha] = useState<Submission[]>([]);
  const [branchArchive, setBranchArchive] = useState<ArchivedBranch[]>([]);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [reviveNotice, setReviveNotice] = useState<string | null>(null);
  const [lastVerdict, setLastVerdict] = useState('');
  const [timer, setTimer] = useState(45);
  const [timerActive, setTimerActive] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    text: string;
    rationale: string;
  } | null>(null);

  const currentPrompt = PROMPTS.find((p) => p.id === promptId)!;
  const activePersona = AI_PERSONAS.find((p) => p.id === personaId) ?? AI_PERSONAS[0]!;
  const totalVotes = submissions.reduce((sum, s) => sum + s.votes, 0);
  const replayingBranch = branchArchive.find((b) => b.id === replayingId) ?? null;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && (phase === 'submit' || phase === 'vote') && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, phase, timer]);

  function resetTimer(start = 45) {
    setTimer(start);
    setTimerActive(true);
  }

  function stopTimer() {
    setTimerActive(false);
  }

  function archiveRejected(rejected: Submission[], winner: Submission, roundNum: number) {
    const entries: ArchivedBranch[] = rejected.map((s) => ({
      id: createId(),
      round: roundNum,
      author: s.author,
      text: s.text,
      votes: s.votes,
      isAI: s.isAI,
      rejectedAgainst: winner.text,
    }));
    setBranchArchive((prev) => [...entries, ...prev]);
  }

  function enterRoom() {
    setPhase('submit');
    setSubmissions([]);
    setUserInput('');
    setUserVoteId(null);
    setLastCanonized(null);
    setLastApocrypha([]);
    setLastVerdict('');
    setAiSuggestion(null);
    setReviveNotice(null);
    setReplayingId(null);
    resetTimer(45);
  }

  function submitUserBeat(textOverride?: string) {
    const text = (textOverride ?? userInput).trim();
    if (!text || text.length > MAX_CHARS) return;

    const newSub: Submission = {
      id: createId(),
      author: PARTICIPANTS.you,
      text,
      votes: 0,
    };

    setSubmissions((prev) => [...prev, newSub]);
    if (!textOverride) setUserInput('');
    setAiSuggestion(null);
  }

  function requestCoAuthorSuggestion() {
    const usedTexts = submissions.map((s) => s.text);
    const suggestion = suggestCoAuthorBranch(
      currentPrompt,
      runningCanon.map((entry) => entry.text),
      usedTexts,
      personaId
    );
    setAiSuggestion(suggestion);
  }

  function adoptCoAuthorSuggestion() {
    if (!aiSuggestion) return;
    setUserInput(aiSuggestion.text);
    setAiSuggestion(null);
  }

  function simulateOthers() {
    const usedTexts = submissions.map((s) => s.text);
    const newSubs: Submission[] = [];

    const t1 = pickUnused(currentPrompt.bank, usedTexts);
    newSubs.push({
      id: createId(),
      author: PARTICIPANTS.scribe1,
      text: t1,
      votes: 0,
    });
    usedTexts.push(t1);

    const t2 = pickUnused(currentPrompt.bank, usedTexts);
    newSubs.push({
      id: createId(),
      author: PARTICIPANTS.scribe2,
      text: t2,
      votes: 0,
    });
    usedTexts.push(t2);

    if (aiEnabled) {
      const tAI = pickUnused(currentPrompt.aiBank, usedTexts);
      newSubs.push({
        id: createId(),
        author: activePersona.name,
        text: tAI,
        votes: 0,
        isAI: true,
      });
    }

    setSubmissions((prev) => [...prev, ...newSubs]);
  }

  function advanceToVote() {
    if (submissions.length === 0) return;
    stopTimer();
    setPhase('vote');
    resetTimer(30);
  }

  function castVote(subId: string) {
    if (phase !== 'vote') return;

    setSubmissions((prev) => {
      let next = prev.map((s) => {
        if (userVoteId && s.id === userVoteId) {
          return { ...s, votes: Math.max(0, s.votes - 1) };
        }
        return s;
      });

      next = next.map((s) => {
        if (s.id === subId) {
          return { ...s, votes: s.votes + 1 };
        }
        return s;
      });

      return next;
    });

    setUserVoteId(subId);
  }

  function simulateCrowd() {
    if (phase !== 'vote' || submissions.length === 0) return;

    setSubmissions((prev) => {
      if (prev.length === 0) return prev;
      const candidates = prev.filter((s) => s.id !== userVoteId);
      if (candidates.length === 0) return prev;

      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const toBoost = shuffled.slice(0, Math.min(2, shuffled.length));

      return prev.map((s) => {
        if (toBoost.some((b) => b.id === s.id)) {
          return { ...s, votes: s.votes + 1 };
        }
        return s;
      });
    });
  }

  function declareCanon() {
    if (submissions.length === 0) return;
    stopTimer();

    const sorted = [...submissions].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return submissions.indexOf(a) - submissions.indexOf(b);
    });

    const winner = sorted[0]!;
    const apocrypha = submissions.filter((s) => s.id !== winner.id);

    const verdict = getVerdict(winner.votes, totalVotes, submissions.length);

    setRunningCanon((prev) => [...prev, winner]);
    archiveRejected(apocrypha, winner, round);

    setLastCanonized(winner);
    setLastApocrypha(apocrypha);
    setLastVerdict(verdict);
    setPhase('canon');
  }

  function replayBranch(branchId: string) {
    setReplayingId((prev) => (prev === branchId ? null : branchId));
    setReviveNotice(null);
  }

  function reviveBranch(branch: ArchivedBranch) {
    setUserInput(branch.text);
    setReviveNotice(
      `Round ${branch.round} apocrypha revived — offer this telling again in the hall.`
    );
    setReplayingId(null);
    setAiSuggestion(null);
    if (phase === 'canon' || phase === 'lobby') {
      setPhase('submit');
      setSubmissions([]);
      setUserVoteId(null);
      resetTimer(45);
    }
  }

  function nextRound() {
    setSubmissions([]);
    setUserInput('');
    setUserVoteId(null);
    setLastCanonized(null);
    setLastApocrypha([]);
    setLastVerdict('');
    setAiSuggestion(null);
    setReviveNotice(null);
    setReplayingId(null);
    setRound((r) => r + 1);
    setPhase('submit');
    resetTimer(45);
  }

  function forgeNewLegend() {
    setSubmissions([]);
    setUserInput('');
    setUserVoteId(null);
    setRunningCanon([]);
    setLastCanonized(null);
    setLastApocrypha([]);
    setBranchArchive([]);
    setLastVerdict('');
    setRound(1);
    setPhase('lobby');
    setAiSuggestion(null);
    setReviveNotice(null);
    setReplayingId(null);
    stopTimer();
    setTimer(45);
  }

  function changePrompt(newId: string) {
    if (phase !== 'lobby') return;
    setPromptId(newId);
  }

  const canSubmitUser = userInput.trim().length > 0 && userInput.trim().length <= MAX_CHARS;
  const allSimulated = submissions.length >= (aiEnabled ? 4 : 3);
  const userHasVoted = userVoteId !== null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 font-mono text-sm">
      <div className="mb-6 rounded-xl border border-amber-500/60 bg-amber-950/30 px-4 py-3 text-amber-200">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg">⚒︎</span>
          <div className="flex-1">
            <div className="font-bold uppercase tracking-[2px] text-[10px] text-amber-400">
              PROTOTYPE v0.1 — LOCAL ONLY • BRANCH ARCHIVE
            </div>
            <div className="mt-1 text-[12px] leading-snug text-amber-100/90">
              StoryTunes fit test: submit → vote → canon, rejected branches archived with replay and
              revive, plus fixture-only AI co-author suggestions. No persistence, no paid APIs, no
              connection to strategy saves.
            </div>
            <div className="mt-1 text-[10px] text-amber-400/70">
              See <span className="underline">STORY-ROOMS.md</span> for placement note (stay in Open
              Historia for now).
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[3px] text-amber-500/70">
            OPEN HISTORIA • STORY ROOM MODE
          </div>
          <div className="font-serif text-2xl text-slate-100">{currentPrompt.title}</div>
          <div className="text-slate-400 text-xs mt-0.5">{currentPrompt.short}</div>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          ROUND {round}
          <br />
          {phase.toUpperCase()}
          {branchArchive.length > 0 && (
            <>
              <br />
              <span className="text-rose-400/80">{branchArchive.length} archived</span>
            </>
          )}
        </div>
      </div>

      {runningCanon.length > 0 && (
        <div className="mb-6 rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-emerald-400 text-[10px] uppercase tracking-widest">
            <span>✧</span> CANON SO FAR (the record grows)
          </div>
          <div className="space-y-2 text-emerald-100/90 text-[12px] leading-relaxed">
            {runningCanon.map((entry) => (
              <div key={entry.id} className="border-l-2 border-emerald-700/60 pl-3">
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {branchArchive.length > 0 && (
        <div className="mb-6 rounded-lg border border-rose-900/50 bg-rose-950/10 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-400 text-[10px] uppercase tracking-widest">
              <span>✕</span> DIVERGENT SCROLLS — BRANCH ARCHIVE
            </div>
            <div className="text-[10px] text-rose-400/60">{branchArchive.length} preserved</div>
          </div>
          <p className="mb-3 text-[11px] text-rose-200/70 leading-snug">
            Rejected tellings from every round. Replay them as what-if theater, or revive one as
            your next offering.
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {branchArchive.map((b) => {
              const isOpen = replayingId === b.id;
              return (
                <div
                  key={b.id}
                  className={`rounded border p-2.5 text-[12px] transition ${
                    isOpen
                      ? 'border-rose-500/60 bg-rose-950/25'
                      : 'border-rose-900/40 bg-rose-950/5'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-rose-400/70 mb-1">
                    <span>{b.author}</span>
                    <span className="text-slate-600">•</span>
                    <span>round {b.round}</span>
                    <span className="text-slate-600">•</span>
                    <span>
                      {b.votes} vote{b.votes === 1 ? '' : 's'}
                    </span>
                    {b.isAI && <span className="text-sky-400/80">AI</span>}
                  </div>
                  <div className="text-rose-100/85 leading-snug line-clamp-2">{b.text}</div>
                  {isOpen && (
                    <div className="mt-2 rounded border border-rose-800/50 bg-slate-950/60 p-2.5 text-[11px] text-rose-100/90 leading-relaxed">
                      <div className="text-[10px] uppercase tracking-widest text-rose-400/80 mb-1">
                        REPLAY — THE ROAD NOT TAKEN
                      </div>
                      {b.text}
                      <div className="mt-2 text-[10px] text-slate-500 italic">
                        Canon instead chose: “{b.rejectedAgainst.slice(0, 80)}
                        {b.rejectedAgainst.length > 80 ? '…' : ''}”
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => replayBranch(b.id)}
                      className="flex-1 rounded border border-rose-800/60 py-1 text-[10px] uppercase tracking-widest text-rose-300 hover:bg-rose-950/40"
                    >
                      {isOpen ? 'Close replay' : 'Replay'}
                    </button>
                    <button
                      type="button"
                      onClick={() => reviveBranch(b)}
                      className="flex-1 rounded bg-rose-500/90 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-950 hover:bg-rose-400"
                    >
                      Revive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {replayingBranch && replayingId && phase !== 'lobby' && (
        <div className="sr-only" aria-live="polite">
          Replaying branch from round {replayingBranch.round}
        </div>
      )}

      {reviveNotice && (
        <div className="mb-4 rounded-lg border border-amber-700/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/90">
          {reviveNotice}
        </div>
      )}

      {phase === 'lobby' && (
        <div className="space-y-6">
          <div className="text-slate-300 text-[13px] leading-relaxed max-w-prose">
            A small hall of scribes and speculators. One prompt. Short offerings. A vote. A single
            telling becomes canon. Everything else enters the branch archive — replay or revive any
            apocrypha later.
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
              CHOOSE A LEGEND TO FORGE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => changePrompt(p.id)}
                  className={`text-left rounded-lg border px-3 py-2 transition ${
                    promptId === p.id
                      ? 'border-amber-500/70 bg-amber-950/30 text-amber-200'
                      : 'border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm">{p.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.short}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-slate-300">Include AI co-author in simulated round</span>
            </label>
            {aiEnabled && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                  CO-AUTHOR PERSONA (FIXTURE)
                </div>
                <div className="flex flex-wrap gap-2">
                  {AI_PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersonaId(p.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition ${
                        personaId === p.id
                          ? 'border-sky-500/70 bg-sky-950/30 text-sky-200'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.tagline}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={enterRoom}
            className="w-full rounded-lg bg-amber-500 py-3 font-bold uppercase tracking-[2px] text-slate-950 hover:bg-amber-400 active:bg-amber-600 transition"
          >
            Enter the Canon Forge
          </button>

          <div className="text-[10px] text-slate-600 text-center">
            4 participants • 1–3 sentence offerings • one vote • archive + replay + revive
          </div>
        </div>
      )}

      {phase === 'submit' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-amber-900/40 bg-slate-950/60 px-3 py-2 text-xs">
            <div>
              <span className="uppercase tracking-widest text-amber-400">SUBMISSIONS OPEN</span>
              <span className="ml-2 text-slate-500">• timer is visual only (demo)</span>
            </div>
            <div className="font-mono text-amber-300">{timer}s left</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-[12px] leading-relaxed text-slate-300">
            {currentPrompt.seed}
          </div>

          {aiEnabled && (
            <div className="rounded-lg border border-sky-900/50 bg-sky-950/15 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[10px] uppercase tracking-widest text-sky-400">
                  AI CO-AUTHOR — {activePersona.name}
                </div>
                <button
                  type="button"
                  onClick={requestCoAuthorSuggestion}
                  className="rounded border border-sky-700/60 px-2 py-1 text-[10px] uppercase tracking-widest text-sky-300 hover:bg-sky-950/40"
                >
                  Suggest a branch
                </button>
              </div>
              {aiSuggestion ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-sky-200/80 italic">{aiSuggestion.rationale}</p>
                  <p className="text-[12px] text-slate-200 leading-snug">{aiSuggestion.text}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={adoptCoAuthorSuggestion}
                      className="flex-1 rounded bg-sky-500/90 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-950 hover:bg-sky-400"
                    >
                      Adopt into your telling
                    </button>
                    <button
                      type="button"
                      onClick={() => submitUserBeat(aiSuggestion.text)}
                      className="flex-1 rounded border border-sky-700/60 py-1.5 text-[10px] uppercase tracking-widest text-sky-300 hover:bg-sky-950/30"
                    >
                      Submit as-is
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiSuggestion(null)}
                      className="rounded border border-slate-700 px-2 py-1.5 text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Fixture-only suggestion from prompt banks, weighted by canon so far. No API call.
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
              <div>YOUR TELLING</div>
              <div className={userInput.length > MAX_CHARS ? 'text-rose-400' : ''}>
                {userInput.length}/{MAX_CHARS}
              </div>
            </div>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="One surprising ripple (1–3 sentences). No essays — the hall is waiting."
              className="w-full min-h-[92px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => submitUserBeat()}
                disabled={!canSubmitUser}
                className="flex-1 rounded bg-amber-500 py-2 text-xs font-bold uppercase tracking-widest text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400"
              >
                Submit my beat
              </button>
              <button
                type="button"
                onClick={simulateOthers}
                disabled={allSimulated}
                className="flex-1 rounded border border-slate-700 py-2 text-xs uppercase tracking-widest text-slate-300 hover:bg-slate-900 disabled:opacity-40"
              >
                Scribes have their say (sim others)
              </button>
            </div>
          </div>

          {submissions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                OFFERINGS SO FAR ({submissions.length})
              </div>
              <div className="space-y-2">
                {submissions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-[12px]"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                      <span className={s.isAI ? 'text-sky-400' : ''}>{s.author}</span>
                      {s.isAI && <span className="text-[9px] text-sky-500/70">AI CO-AUTHOR</span>}
                    </div>
                    <div className="text-slate-200 leading-snug">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={advanceToVote}
              disabled={submissions.length === 0}
              className="w-full rounded-lg border border-amber-500/70 py-2.5 text-xs uppercase tracking-[2px] text-amber-400 hover:bg-amber-950/40 disabled:border-slate-800 disabled:text-slate-600"
            >
              Close submissions &amp; open the vote
            </button>
          </div>
        </div>
      )}

      {phase === 'vote' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-sky-900/40 bg-slate-950/60 px-3 py-2 text-xs">
            <div>
              <span className="uppercase tracking-widest text-sky-400">THE VOTE IS CAST</span>
            </div>
            <div className="font-mono text-sky-300">{timer}s</div>
          </div>

          <div className="grid gap-3">
            {submissions.map((s) => {
              const isChosen = userVoteId === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-3 transition ${isChosen ? 'border-emerald-500/70 bg-emerald-950/10' : 'border-slate-800 bg-slate-950/40'}`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={s.isAI ? 'text-sky-400' : 'text-slate-400'}>{s.author}</span>
                      {s.isAI && <span className="text-[9px] text-sky-500/60">AI</span>}
                    </div>
                    <div className="font-mono text-emerald-400/80 tabular-nums">
                      {s.votes} vote{s.votes === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-slate-200 text-[13px] leading-snug mb-3">{s.text}</div>
                  <button
                    type="button"
                    onClick={() => castVote(s.id)}
                    className={`w-full rounded py-1.5 text-[10px] uppercase tracking-widest transition ${
                      isChosen
                        ? 'bg-emerald-500/90 text-emerald-950'
                        : 'border border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/30'
                    }`}
                  >
                    {isChosen ? 'You support this telling' : 'Support this telling'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={simulateCrowd}
              className="flex-1 rounded border border-slate-700 py-2 text-xs uppercase tracking-widest text-slate-300 hover:bg-slate-900"
            >
              Simulate the hall’s murmurs
            </button>
            <button
              type="button"
              onClick={declareCanon}
              disabled={!userHasVoted && submissions.length > 1}
              className="flex-1 rounded bg-emerald-500 py-2 text-xs font-bold uppercase tracking-widest text-emerald-950 disabled:opacity-40"
            >
              Seal the canon with the tally
            </button>
          </div>
        </div>
      )}

      {phase === 'canon' && lastCanonized && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/60 bg-emerald-950/10 p-4">
            <div className="uppercase tracking-[3px] text-emerald-400 text-[10px] mb-1">
              CANONIZED
            </div>
            <div className="font-serif text-lg text-emerald-100 leading-tight mb-2">
              {lastCanonized.text}
            </div>
            <div className="text-emerald-400/70 text-xs">— {lastCanonized.author}</div>
            <div className="mt-4 border-t border-emerald-900/50 pt-3 text-[12px] text-emerald-300/90">
              {lastVerdict}
            </div>
          </div>

          {lastApocrypha.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-[10px] uppercase tracking-widest mb-2">
                <span>✕</span> THIS ROUND — NOW IN THE ARCHIVE
              </div>
              <div className="space-y-2">
                {lastApocrypha.map((s) => (
                  <div
                    key={s.id}
                    className="rounded border border-rose-900/40 bg-rose-950/5 p-2.5 text-[12px]"
                  >
                    <div className="text-rose-400/70 text-[10px] mb-0.5">{s.author}</div>
                    <div className="text-rose-100/80 leading-snug">{s.text}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-rose-400/60">
                Archived above — replay or revive any time before forging a new legend.
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={nextRound}
              className="flex-1 rounded-lg bg-amber-500 py-3 text-sm font-bold uppercase tracking-[2px] text-slate-950 hover:bg-amber-400"
            >
              Begin the next round on this canon
            </button>
            <button
              type="button"
              onClick={forgeNewLegend}
              className="flex-1 rounded-lg border border-slate-700 py-3 text-sm uppercase tracking-[2px] text-slate-300 hover:bg-slate-900"
            >
              Forge an entirely new legend
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-slate-800 pt-4 text-[10px] text-slate-600 flex items-center justify-between">
        <div>
          Local prototype • {aiEnabled ? `${activePersona.name} on` : 'AI off'} •{' '}
          {branchArchive.length} archived branch{branchArchive.length === 1 ? '' : 'es'}
        </div>
        <button
          type="button"
          onClick={forgeNewLegend}
          className="underline decoration-dotted hover:text-slate-400"
        >
          reset everything
        </button>
      </div>
    </div>
  );
}
