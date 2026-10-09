import React, { useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { captureAuthFailure } from '@/lib/foundry-monitoring';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FEATURES = [
  {
    icon: (
      <svg
        aria-hidden="true"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
        />
      </svg>
    ),
    title: 'Cloud Saves',
    desc: 'Stored securely in the cloud',
  },
  {
    icon: (
      <svg
        aria-hidden="true"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
        />
      </svg>
    ),
    title: 'Cross-Device',
    desc: 'Resume on any device',
  },
  {
    icon: (
      <svg
        aria-hidden="true"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    title: 'Secure & Free',
    desc: 'No passwords, no cost',
  },
];

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.pathname,
      });
      if (result?.error) {
        const message = result.error.message ?? 'Google sign-in failed';
        captureAuthFailure({
          provider: 'google',
          stage: 'signin',
          reason: message,
          source: 'auth-modal',
        });
        setError(message);
        setLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      captureAuthFailure({
        provider: 'google',
        stage: 'signin',
        reason: message,
        source: 'auth-modal',
      });
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in">
        {/* Top accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Close button */}
        <button
          type="button"
          aria-label="Close sign-in dialog"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-300 hover:bg-slate-800/80 transition-all duration-200"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Branded Header */}
        <div className="relative px-8 pt-10 pb-6 text-center overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, rgba(217, 119, 6, 0.06) 0%, transparent 70%)',
            }}
          />
          <h2 className="relative text-2xl font-serif font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 mb-1.5">
            OPEN HISTORIA
          </h2>
          <p className="relative text-xs text-slate-500 tracking-widest uppercase">
            Generative Grand Strategy
          </p>
          <div className="mx-auto mt-5 w-24 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
        </div>

        {/* Features */}
        <div className="px-8 pb-6">
          <div className="grid grid-cols-3 gap-3 mb-7">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-amber-500/80 mb-2">
                  {f.icon}
                </div>
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{f.title}</p>
                <p className="text-[10px] text-slate-600 leading-tight">{f.desc}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl p-3 mb-4">
              {error}
            </div>
          )}

          {/* Google sign-in button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <p className="text-[10px] text-slate-700 text-center mt-5 leading-relaxed">
            We only use your email to identify your saves.
            <br />
            No data is shared. No spam, ever.
          </p>
        </div>

        {/* Bottom accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>
    </div>
  );
}
