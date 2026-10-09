import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-slate-300">
      <Link to="/" className="text-xs text-slate-500 hover:text-amber-400">
        ← Open Historia
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-amber-400">Privacy</h1>
      <p className="mt-4 text-xs text-slate-500">Last updated: 2026-09-29.</p>

      <h2 className="mt-8 text-base font-semibold text-amber-500">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Google OAuth identity (id, name, email, avatar) when you sign in.</li>
        <li>Cloud saves you create — game state, command history, story-so-far.</li>
        <li>An encrypted copy of any API key you save in settings.</li>
        <li>
          Anonymous website analytics through App Health: page paths, referring hostname, coarse
          browser/device/country categories, and a project-scoped visitor identifier held in
          first-party local storage for up to 90 days. The tracker does not store raw IP addresses
          or user-agent strings and does not set analytics cookies.
        </li>
        <li>
          When server endpoint monitoring is enabled, API requests send their method, normalized
          route template, response status, duration, and declared response byte count to App Health.
          Request bodies, headers, query values, concrete route parameters, and identity are not
          included.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold text-amber-500">What we don&apos;t</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>No remarketing tags.</li>
        <li>No sharing of your saves or commands with anyone.</li>
        <li>Guests can play without signing in; nothing is stored server-side.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold text-amber-500">LLM provider</h2>
      <p className="mt-2">
        When you take a turn the entire game state (you can inspect the JSON payload in your
        browser&apos;s network tab) is sent to whichever provider you&apos;ve picked on setup. Their
        privacy policy applies.
      </p>

      <h2 className="mt-8 text-base font-semibold text-amber-500">Deletion</h2>
      <p className="mt-2">
        Delete individual saves from the timeline panel, or revoke the Google OAuth grant in your
        account settings to disconnect.
      </p>
    </main>
  );
}
