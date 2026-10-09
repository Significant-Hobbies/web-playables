import { Link } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Natural-language command',
    body: 'No menus, no build queues. Type what you want — raise an army, broker a marriage alliance, fund a rebellion — and the Game Master works out what happens.',
  },
  {
    title: 'An AI as the rules engine',
    body: 'There is no hard combat math. A large language model adjudicates every turn, returning a strict-shape JSON contract that updates the map, diplomacy, and the timeline.',
  },
  {
    title: 'Rewind and branch history',
    body: 'Every turn is a snapshot on the timeline. Rewind to any prior point and branch a new alternate history from there — your choices are never final.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Pick a scenario',
    body: 'Start from a historical, modern, alternate, or fictional preset — or write your own. Choose the nation you command and an AI provider.',
  },
  {
    n: '02',
    title: 'Issue your orders',
    body: 'Queue commands in plain English and advance time. The Game Master returns the consequences: territory changes, events, and shifting relations.',
  },
  {
    n: '03',
    title: 'Watch history unfold',
    body: 'The world map and diplomacy threads update live. Rewind any turn, branch a new timeline, and save your game to the cloud when signed in.',
  },
];

export default function AboutPage() {
  return (
    <div className="h-screen overflow-y-auto bg-[#0B0F19] text-slate-200">
      <header className="mx-auto max-w-5xl px-5 pt-16 pb-12 text-center sm:pt-24">
        <Link
          to="/"
          className="text-xs uppercase tracking-[0.2em] text-amber-500/80 hover:text-amber-400"
        >
          Open Historia
        </Link>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-amber-400 sm:text-5xl md:text-6xl">
          Steer history, one order at a time.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
          Open Historia is an open-source AI grand-strategy game. You command a civilization in
          plain English, and a large-language-model Game Master adjudicates every turn on a living
          world map.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/play"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-500 sm:w-auto"
          >
            Play now — free
          </Link>
          <a
            href="#how"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-700 px-6 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 sm:w-auto"
          >
            How it works
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          No account required. Bring your own AI key, or run a local model.
        </p>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-800 bg-[#151B2B] p-5">
              <h3 className="text-base font-semibold text-amber-400">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          How a game works
        </h2>
        <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-slate-800 bg-[#151B2B] p-5">
              <div className="font-mono text-xs tracking-[0.15em] text-amber-500/70">{s.n}</div>
              <h3 className="mt-3 text-base font-semibold text-slate-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-xl font-semibold text-amber-500">Pluggable AI</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Pick a provider on game setup — Anthropic Claude, OpenAI, Google Gemini, DeepSeek, or a
          local OpenAI-compatible endpoint. Your API key stays in your session and is sent only to
          the provider you chose.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-amber-500">
          Saves &amp; alternate timelines
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Cloud save when signed in; rewind to any prior turn and branch a new timeline from there.
          Saves serialize only province ownership, so the format survives changes to the underlying
          map data.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-amber-500">What it isn&apos;t</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>A live multiplayer game. (Yet.)</li>
          <li>
            A simulation with hard combat math — the LLM is the rules engine, with strict-shape JSON
            as the contract.
          </li>
          <li>A chat-with-NPC product. The AI is the world referee, not a character.</li>
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Ready to rewrite history?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
          Open the map, pick a nation, and give your first order.
        </p>
        <div className="mt-7">
          <Link
            to="/play"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-amber-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Start a game
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800/60 py-8 text-center text-xs text-slate-600">
        Open Historia · open-source AI grand strategy ·{' '}
        <Link to="/privacy" className="hover:text-slate-400">
          Privacy
        </Link>
        {' · '}
        <a
          href="https://github.com/sarthakagrawal927/open-historia"
          aria-label="GitHub repository"
          title="GitHub repository"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center align-middle text-slate-600 hover:text-slate-400"
        >
          <span className="sr-only">GitHub repository</span>
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </footer>
    </div>
  );
}
