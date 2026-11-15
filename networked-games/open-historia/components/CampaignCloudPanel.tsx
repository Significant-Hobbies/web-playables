import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  exportCampaignCopy,
  getCampaignCloudStatus,
  resolveCampaignConflict,
  type CampaignCloudStatus,
} from '@/lib/game-storage';

const actionStyle =
  'rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50';
export default function CampaignCloudPanel({
  open,
  setOpen,
  user,
  processing,
  onSave,
  onLoad,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  user?: { name: string; email: string };
  processing: boolean;
  onSave: () => Promise<boolean>;
  onLoad: (id: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<CampaignCloudStatus>(getCampaignCloudStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const change = () => setStatus(getCampaignCloudStatus());
    window.addEventListener('playables:historia-cloud-state', change);
    return () => window.removeEventListener('playables:historia-cloud-state', change);
  }, []);
  useEffect(() => {
    if (status.phase === 'conflict') setOpen(true);
  }, [status.phase, setOpen]);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  async function run(action: () => Promise<void> | void) {
    if (busy || processing) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The action failed. Your local campaign is kept.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function resolve(choice: 'cloud' | 'local' | 'keep-both') {
    if (!status.id) return;
    const copy = await resolveCampaignConflict(status.id, choice);
    if (!copy) throw new Error('The selected campaign is unavailable. Your local copy is kept.');
    await onLoad(copy.id);
    setOpen(false);
  }
  function download(recovery: boolean) {
    const copy = exportCampaignCopy(recovery);
    if (!copy) throw new Error('No saved copy is available yet.');
    const url = URL.createObjectURL(new Blob([copy.data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = copy.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="campaign-cloud-title"
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-xl max-h-[calc(100dvh-2rem)] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-100 backdrop:bg-black/70"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) setOpen(false);
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="campaign-cloud-title" className="text-xl font-bold">
          Account & campaign saves
        </h2>
        <button
          type="button"
          className={actionStyle}
          disabled={busy}
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
      <p className="my-4 text-sm text-slate-400">
        {user ? `${user.name} · ${user.email}` : 'Guest campaign · saved in this browser'}
      </p>
      <p role="status" className="my-4 text-sm text-amber-200">
        {status.phase === 'saved'
          ? 'Cloud checkpoint acknowledged.'
          : status.phase === 'conflict'
            ? 'Another cloud version exists. Local progress is still being saved.'
            : status.phase === 'offline'
              ? 'Cloud is unavailable. Your campaign is saved locally.'
              : 'Saved locally. Cloud acknowledgement appears after a successful account save.'}
      </p>
      {status.message && <p className="my-3 text-sm text-slate-400">{status.message}</p>}
      {error && (
        <p role="alert" className="my-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {processing && (
        <p className="my-3 text-sm text-amber-200">
          Wait for the current turn before changing accounts or restoring a campaign.
        </p>
      )}
      {status.phase === 'conflict' && user ? (
        <section className="my-5 space-y-3">
          <h3 className="font-bold">Choose a campaign</h3>
          <p className="text-sm text-slate-400">
            Cloud replacement keeps a local recovery copy. Keeping both creates a separate campaign.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || processing}
              className={actionStyle}
              onClick={() => void run(() => resolve('cloud'))}
            >
              Continue cloud campaign
            </button>
            <button
              type="button"
              disabled={busy || processing}
              className={actionStyle}
              onClick={() => void run(() => resolve('local'))}
            >
              Use local campaign
            </button>
            <button
              type="button"
              disabled={busy || processing}
              className={actionStyle}
              onClick={() => void run(() => resolve('keep-both'))}
            >
              Keep both campaigns
            </button>
            <button
              type="button"
              disabled={busy}
              className={actionStyle}
              onClick={() => setOpen(false)}
            >
              Continue locally
            </button>
          </div>
        </section>
      ) : (
        <div className="my-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || processing}
            className={actionStyle}
            onClick={() =>
              void run(async () => {
                if (!(await onSave()))
                  throw new Error('The local checkpoint could not be saved. Keep this tab open.');
              })
            }
          >
            Save now
          </button>
          <button
            type="button"
            disabled={busy || processing}
            className={actionStyle}
            onClick={() =>
              void run(async () => {
                if (!(await onSave()))
                  throw new Error('Save your campaign before changing accounts.');
                if (user) {
                  await authClient.signOut();
                  location.reload();
                } else {
                  const result = await authClient.signIn.social({
                    provider: 'google',
                    callbackURL: location.href,
                  });
                  if (result.error)
                    throw new Error(result.error.message || 'Google sign-in is unavailable.');
                }
              })
            }
          >
            {user ? 'Sign out' : 'Continue with Google'}
          </button>
        </div>
      )}
      <section className="border-t border-slate-700 pt-4">
        <h3 className="font-bold">Keep a copy</h3>
        <p className="my-2 text-sm text-slate-400">
          Downloads contain the last persisted campaigns, with provider credentials removed.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={actionStyle}
            disabled={busy || processing}
            onClick={() => void run(() => download(false))}
          >
            Download local campaigns
          </button>
          <button
            type="button"
            className={actionStyle}
            disabled={busy || processing}
            onClick={() => void run(() => download(true))}
          >
            Download recovery copy
          </button>
        </div>
      </section>
      {busy && (
        <p role="status" className="mt-4 text-sm text-slate-400">
          Working…
        </p>
      )}
    </dialog>
  );
}
