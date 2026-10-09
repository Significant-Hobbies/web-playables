import { Link } from 'react-router-dom';

const COMPARISON = [
  {
    label: 'Cost model',
    openHistoria:
      'Free to play — bring your own AI provider key, a local model, or the shared free gateway. No credit meter.',
    theirs: 'Hosted platform where play runs through its own service.',
  },
  {
    label: 'Source',
    openHistoria: 'MIT-licensed and public on GitHub.',
    theirs: 'Closed-source platform.',
  },
  {
    label: 'Where it runs',
    openHistoria:
      'In the browser — nothing to install. Guests play with local saves; optional sign-in adds cloud saves.',
    theirs: 'Hosted web and mobile apps.',
  },
  {
    label: 'How you play',
    openHistoria:
      'Type orders in plain English; an AI Game Master adjudicates each turn into map, diplomacy, and timeline changes.',
    theirs: 'Create, share, and play community-built AI sandbox worlds.',
  },
];

const PICKS = [
  {
    title: 'Plain-English grand strategy',
    body: 'Raise an army, broker an alliance, fund a rebellion — type the order and the Game Master works out what happens on the map.',
  },
  {
    title: '20+ scenarios',
    body: 'Historical, modern, alternate-history, and fictional presets — pick a nation and start a campaign in seconds.',
  },
  {
    title: 'Rewindable timeline',
    body: 'Every turn is a snapshot. Rewind to any decision and branch a new alternate history from there.',
  },
];

export default function PaxHistoriaAlternativePage() {
  return (
    <div className="h-screen overflow-y-auto bg-[#0B0F19] text-slate-200">
      <header className="mx-auto max-w-5xl px-5 pt-16 pb-12 text-center sm:pt-24">
        <Link
          to="/"
          className="text-xs uppercase tracking-[0.2em] text-amber-500/80 hover:text-amber-400"
        >
          Open Historia
        </Link>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-amber-400 sm:text-5xl">
          A free, open-source Pax Historia alternative
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
          If you like the idea of an AI-adjudicated alternate-history sandbox but want one you can
          open in a browser, inspect, and run on your own AI provider — that&apos;s what Open
          Historia is.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/play"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-500 sm:w-auto"
          >
            Play in the browser — free
          </Link>
          <a
            href="#compare"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-700 px-6 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 sm:w-auto"
          >
            Compare
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PICKS.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-800 bg-[#151B2B] p-5">
              <h3 className="text-base font-semibold text-amber-400">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="compare" className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Open Historia vs. Pax Historia
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-400">
          Pax Historia is a polished hosted platform with a large community. Open Historia is a
          smaller open-source experiment — the honest trade-offs:
        </p>
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 gap-2 p-5 sm:grid-cols-[10rem_1fr_1fr] sm:gap-6 ${
                i % 2 === 0 ? 'bg-[#151B2B]' : 'bg-[#0f1522]'
              }`}
            >
              <div className="text-sm font-semibold text-slate-100">{row.label}</div>
              <div className="text-sm leading-6 text-slate-300">{row.openHistoria}</div>
              <div className="text-sm leading-6 text-slate-400">{row.theirs}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-xl font-semibold text-amber-500">Where it&apos;s still behind</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Open Historia is a held experiment, not a finished platform. The map detail and campaign
          pacing are prototype-grade, and there is no multiplayer or community scenario marketplace
          yet. If you want the mature product, Pax Historia is it — if you want the open, hackable,
          no-credits version to play with or build on, try this one.
        </p>
        <h2 className="mt-8 text-xl font-semibold text-amber-500">Your keys, your provider</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Pick Anthropic Claude, OpenAI, Google Gemini, DeepSeek, a local OpenAI-compatible model,
          or the shared free gateway on setup. Provider keys stay in your session and go only to the
          provider you chose.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Start an alternate history
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
          Pick a scenario, choose a nation, give your first order.
        </p>
        <div className="mt-7">
          <Link
            to="/play"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-amber-600 px-8 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Play Open Historia
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800/60 py-8 text-center text-xs text-slate-600">
        Open Historia · open-source AI grand strategy ·{' '}
        <Link to="/about" className="hover:text-slate-400">
          About
        </Link>
        {' · '}
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
