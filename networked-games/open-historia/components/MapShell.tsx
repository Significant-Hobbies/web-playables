import React from 'react';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Shared backdrop used by loading / error / empty states. A subtle
// hand-drawn globe sits behind the message — even when no real data
// is available, the screen still feels like part of the historical
// atlas instead of a stack-trace dump.
// ---------------------------------------------------------------------------

function StylizedGlobe({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-40 h-40 sm:w-48 sm:h-48 text-amber-500/70 ${pulsing ? 'animate-breathe' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="oceanFill" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0a1628" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="rgba(245,158,11,0)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0.25)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#oceanFill)" />
      <circle cx="100" cy="100" r="92" fill="url(#rimGlow)" />
      {/* Latitudes */}
      {[30, 60, 100, 140, 170].map((y) => (
        <ellipse
          key={y}
          cx="100"
          cy={y}
          rx="92"
          ry={Math.max(6, 92 - Math.abs(100 - y) * 0.95)}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth="0.6"
        />
      ))}
      {/* Longitudes */}
      {[20, 50, 80, 100, 120, 150, 180].map((x) => {
        const rx = Math.max(4, 92 - Math.abs(100 - x) * 0.95);
        return (
          <ellipse
            key={x}
            cx="100"
            cy="100"
            rx={rx}
            ry="92"
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="0.6"
          />
        );
      })}
      {/* Stylized landmass silhouettes */}
      <path
        d="M55 60 q15 -8 30 4 q12 12 4 26 q-10 16 -28 12 q-18 -6 -14 -22 q2 -12 8 -20 z"
        fill="rgba(245,158,11,0.18)"
        stroke="rgba(245,158,11,0.55)"
        strokeWidth="0.6"
      />
      <path
        d="M110 70 q22 -4 32 14 q6 18 -10 26 q-22 8 -32 -6 q-8 -12 -2 -22 q4 -10 12 -12 z"
        fill="rgba(245,158,11,0.18)"
        stroke="rgba(245,158,11,0.55)"
        strokeWidth="0.6"
      />
      <path
        d="M70 120 q14 -2 22 8 q4 10 -2 18 q-12 14 -26 6 q-12 -8 -8 -20 q2 -10 14 -12 z"
        fill="rgba(245,158,11,0.18)"
        stroke="rgba(245,158,11,0.55)"
        strokeWidth="0.6"
      />
      <path
        d="M130 130 q12 0 18 10 q2 12 -10 16 q-14 4 -20 -6 q-4 -10 4 -16 q4 -4 8 -4 z"
        fill="rgba(245,158,11,0.18)"
        stroke="rgba(245,158,11,0.55)"
        strokeWidth="0.6"
      />
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="rgba(245,158,11,0.55)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function StateFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center w-screen h-screen bg-slate-950 text-slate-200 font-mono overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-amber-700/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-blue-700/10 rounded-full blur-[140px]" />
      </div>
      {/* Hairline grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative w-full max-w-lg mx-auto px-6 text-center">{children}</div>
    </div>
  );
}

export function MapLoadingState() {
  return (
    <StateFrame>
      <div className="flex flex-col items-center gap-6">
        <StylizedGlobe pulsing />
        <div>
          <h1 className="text-2xl tracking-[0.3em] uppercase text-amber-400 font-bold">
            Open Historia
          </h1>
          <p className="mt-2 text-sm text-slate-400">Charting the atlas…</p>
        </div>
        <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 animate-shimmer"
            style={{ width: '100%' }}
          />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-slate-600">
          Loading topology · no API key required
        </p>
      </div>
    </StateFrame>
  );
}

export function MapUnavailableState({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <StateFrame>
      <div className="flex flex-col items-center gap-6">
        <StylizedGlobe />
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-rose-400 font-bold">
            Atlas Offline
          </p>
          <h1 className="mt-1 text-2xl text-slate-100 font-bold">Map data is unavailable</h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            The world topology asset failed to load. Open Historia renders entirely from a bundled{' '}
            <span className="text-amber-300">TopoJSON</span> file and{' '}
            <span className="text-amber-300">MapLibre GL</span> — no external tile-server key is
            required — so this is usually a network or deployment hiccup, not a missing credential.
          </p>
        </div>

        {error && (
          <pre className="text-left text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/40 rounded-lg p-3 w-full overflow-x-auto whitespace-pre-wrap">
            {error}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Retry
            </button>
          )}
          <Link
            to="/play"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Reload page
          </Link>
        </div>

        <details className="w-full text-left">
          <summary className="text-[11px] uppercase tracking-widest text-slate-500 hover:text-slate-300 cursor-pointer">
            Deployment checklist
          </summary>
          <ul className="mt-2 text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>
              <code className="text-amber-300">public/provinces-combined.json</code> must be served
              at the site root.
            </li>
            <li>
              <code className="text-amber-300">public/admin1-detail.json</code> is lazy-loaded at
              zoom 5+ for state-level detail.
            </li>
            <li>
              The map itself uses MapLibre GL JS with a built-in style — no Mapbox / MapTiler /
              Stadia key, no <code>NEXT_PUBLIC_MAP_*</code> env var.
            </li>
          </ul>
        </details>
      </div>
    </StateFrame>
  );
}
