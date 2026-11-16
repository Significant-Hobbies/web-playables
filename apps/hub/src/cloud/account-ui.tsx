import type { SaveHead } from "@games/cloud-contract";
import { Badge } from "@saas-maker/ui/components/badge";
import { Button } from "@saas-maker/ui/components/button";
import { NativeDialog, NativeSelect } from "@saas-maker/ui/components/native-controls";
import {
  ArrowRight,
  Check,
  Cloud,
  Download,
  History,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "./account.css?inline";
import { type PlayablesCloud, STORAGE_WARNING } from "./runtime";

const phaseLabels = {
  checking: "Checking account",
  guest: "Local journey",
  local: "Saved locally",
  saving: "Saving to cloud",
  saved: "Cloud saved",
  offline: "Playing locally",
  conflict: "Choose a journey",
  "update-required": "Update required",
};
const when = (value: number | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Not yet";
function download(copy: { filename: string; data: string } | null) {
  if (!copy) throw new Error("There is no saved copy to download yet.");
  const url = URL.createObjectURL(new Blob([copy.data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = copy.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function SaveOptions({
  compact,
  recovery,
  children,
}: {
  compact: boolean;
  recovery: boolean;
  children: ReactNode;
}) {
  return compact ? (
    <details className="account-options" open={recovery || undefined}>
      <summary>Save options</summary>
      {children}
    </details>
  ) : (
    children
  );
}
function Account({ cloud }: { cloud: PlayablesCloud }) {
  const [state, setState] = useState(() => cloud.getState());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SaveHead[]>([]);
  const [slot, setSlot] = useState("");
  const [versions, setVersions] = useState<SaveHead[]>([]);
  const [confirm, setConfirm] = useState<SaveHead | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const accountId = state.user?.id;
  useEffect(() => cloud.subscribe(setState), [cloud]);
  useEffect(() => {
    if (
      state.conflict ||
      state.reloadRequired ||
      state.phase === "update-required" ||
      state.authRequired
    )
      setOpen(true);
  }, [state.conflict, state.reloadRequired, state.phase, state.authRequired]);
  useEffect(() => {
    cloud.setPanelOpen(open);
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [cloud, open]);
  useEffect(() => () => cloud.setPanelOpen(false), [cloud]);
  useEffect(() => {
    let current = true;
    if (open && accountId && !state.authRequired)
      void cloud
        .list()
        .then((rows) => {
          if (current) {
            setSlots(rows);
            setSlot(cloud.getSlotId() || rows[0]?.slotId || "");
          }
        })
        .catch(() => {
          if (current) setError("Could not load cloud journeys. Your local copy is kept.");
        });
    return () => {
      current = false;
    };
  }, [cloud, open, accountId, state.authRequired]);
  async function run(action: () => void | Promise<void>) {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not complete this action. Your local journey is kept.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    if (busy || state.reloadRequired || state.phase === "update-required") return;
    if (state.conflict && !(await run(() => cloud.resolveConflict("offline")))) return;
    setOpen(false);
  }
  async function choose(choice: "cloud" | "local" | "cached" | "keep-both" | "offline") {
    if (await run(() => cloud.resolveConflict(choice))) {
      if (!cloud.getState().reloadRequired) setOpen(false);
    }
  }
  const conflict = state.conflict;
  const ember = state.gameId === "ember-road";
  const importing =
    ember && conflict?.reason === "import" && conflict.local && !conflict.cloud && !conflict.cached;
  const title = !ember
    ? "Your journeys, kept."
    : state.reloadRequired
      ? state.user
        ? "Your checkpoint is ready."
        : "Signed out safely."
      : state.phase === "update-required"
        ? "Keep your checkpoint."
        : importing || !state.user
          ? "Keep your journey safe."
          : conflict
            ? "Choose your checkpoint."
            : state.phase === "offline"
              ? "Your journey stays here."
              : "Your journey is safe.";
  const statusRequired =
    state.reloadRequired ||
    state.phase === "update-required" ||
    state.phase === "offline" ||
    !state.user;
  const message =
    statusRequired && state.message
      ? state.message
      : !ember
        ? state.message ||
          (state.user
            ? "Local saves continue while the cloud is unavailable."
            : "You can keep playing without an account.")
        : importing
          ? "Your progress is on this device. Add it to your account to continue on another computer."
          : !state.user
            ? "Play here without an account, or connect Google to carry your progress with you."
            : conflict?.reason === "account-changed"
              ? "This checkpoint is from another account. Choose whether to save it to this account or keep playing locally."
              : conflict
                ? "Choose a checkpoint to continue. Your other copy is kept for recovery."
                : state.phase === "saved"
                  ? "Your checkpoint is saved to your account. Pick up the road wherever you play."
                  : state.message || "Your checkpoint stays on this device while you play.";
  const displayMessage = !state.storageAvailable && message === STORAGE_WARNING ? null : message;
  return (
    <div data-theme="paper" className={`cloud-shell${ember ? " ember-cloud" : ""}`}>
      <Button
        variant="outline"
        size="sm"
        aria-label="Account and saves"
        title={importing ? "Save your journey" : phaseLabels[state.phase]}
        onClick={() => setOpen(true)}
        className="account-trigger"
      >
        <UserRound size={16} />
        <span>
          {state.user
            ? importing
              ? "Save your journey"
              : phaseLabels[state.phase]
            : "Account & saves"}
        </span>
        <i data-phase={state.phase} />
      </Button>
      <NativeDialog
        ref={dialog}
        aria-labelledby="cloud-title"
        className="account-dialog"
        onCancel={(event) => {
          event.preventDefault();
          void close();
        }}
      >
        <header className="account-heading">
          <div>
            {ember && (
              <span className="checkpoint-crest" aria-hidden="true">
                <ShieldCheck />
              </span>
            )}
            <span className="eyebrow">
              {ember ? "EMBER ROAD · SAVE YOUR JOURNEY" : "WEB PLAYABLES"}
            </span>
            <h2 id="cloud-title">{title}</h2>
          </div>
          {!state.reloadRequired && state.phase !== "update-required" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close account"
              disabled={busy}
              onClick={() => void close()}
            >
              <X />
            </Button>
          )}
        </header>
        {!ember && (
          <div className="account-identity">
            <UserRound />
            <div>
              <strong>{state.user?.name || "Play as a guest"}</strong>
              <p>{state.user?.email || "Play locally, or sign in with Google for cloud saves."}</p>
            </div>
            <Badge variant="secondary">{phaseLabels[state.phase]}</Badge>
          </div>
        )}
        {displayMessage && (
          <div role="status" aria-live="polite" className="account-message">
            {displayMessage}
          </div>
        )}
        {!state.storageAvailable && (
          <p role="alert" className="account-error">
            {STORAGE_WARNING}
          </p>
        )}
        {ember &&
          state.localSavedAt &&
          state.storageAvailable &&
          !state.reloadRequired &&
          state.phase !== "update-required" &&
          !(!importing && conflict) && (
            <div className="ember-checkpoint">
              <span className="checkpoint-portrait" aria-hidden="true" />
              <div>
                <strong>Last saved checkpoint</strong>
                <small>{when(state.localSavedAt)}</small>
              </div>
              <span className="checkpoint-location">
                {state.phase === "saved" ? "Cloud saved" : "On this device"}
                <Check size={13} />
              </span>
            </div>
          )}
        {ember && state.user && (
          <p className="checkpoint-account">
            <UserRound size={14} />
            Signed in as {state.user.name || state.user.email}
          </p>
        )}
        {error && (
          <p role="alert" className="account-error">
            {error}
          </p>
        )}
        {state.reloadRequired ? (
          <section className="account-section">
            <h3>Your selected journey is ready</h3>
            <p>
              Reload the game to continue with this saved copy. The previous local copy is available
              below.
            </p>
            <Button onClick={() => location.reload()}>
              Reload game <RefreshCw />
            </Button>
          </section>
        ) : state.phase === "update-required" ? (
          <section className="account-section">
            <h3>This save needs a newer game</h3>
            <p>Your saved bytes are kept. Download a copy before updating.</p>
            <Button onClick={() => location.reload()}>
              Check for an update <RefreshCw />
            </Button>
          </section>
        ) : importing ? (
          <section className="import-prompt">
            <Button disabled={busy} onClick={() => void choose("local")}>
              <Cloud size={18} />
              Save to my account
              <ArrowRight size={18} />
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => void choose("offline")}>
              Not now · keep playing
            </Button>
          </section>
        ) : conflict ? (
          <section className="account-section">
            <h3>Choose where to continue</h3>
            <p>
              Loading a cloud journey keeps a recovery copy of the local save. Keeping both creates
              another cloud slot.
            </p>
            <div className="copy-grid">
              <div>
                <span className="eyebrow">THIS DEVICE</span>
                <strong>{conflict.local ? "Local journey" : "No local journey"}</strong>
                <small>{when(conflict.local?.savedAt || null)}</small>
                {conflict.local?.owner && conflict.local.owner !== state.user?.id && (
                  <small>From another signed-in account</small>
                )}
              </div>
              <div>
                <span className="eyebrow">CLOUD</span>
                <strong>{conflict.cloud?.metadata.title || "No cloud journey"}</strong>
                <small>{when(conflict.cloud?.updatedAt || null)}</small>
              </div>
            </div>
            <div className="account-actions">
              {conflict.cached && (
                <Button onClick={() => void choose("cached")} disabled={busy}>
                  Use cached account journey · {when(conflict.cached.savedAt)}
                </Button>
              )}
              {conflict.cloud && (
                <Button disabled={busy} onClick={() => void choose("cloud")}>
                  Continue cloud journey
                </Button>
              )}
              {conflict.local && (
                <Button variant="outline" disabled={busy} onClick={() => void choose("local")}>
                  {conflict.cloud ? "Use this device's journey" : "Add this journey to cloud"}
                </Button>
              )}
              {conflict.local && conflict.cloud && (
                <Button variant="outline" disabled={busy} onClick={() => void choose("keep-both")}>
                  Keep both journeys
                </Button>
              )}
              <Button variant="ghost" disabled={busy} onClick={() => void choose("offline")}>
                Continue locally
              </Button>
            </div>
          </section>
        ) : ember ? (
          <section className="import-prompt">
            <Button
              disabled={busy || state.phase === "checking"}
              onClick={() =>
                void run(() =>
                  !state.user
                    ? cloud.signIn()
                    : state.authRequired
                      ? cloud.signIn()
                      : state.phase === "offline"
                        ? cloud.refreshSession()
                        : cloud.checkpoint(),
                )
              }
            >
              <Cloud size={18} />
              {!state.user
                ? "Continue with Google"
                : state.authRequired
                  ? "Sign in again"
                  : state.phase === "offline"
                    ? "Reconnect cloud saves"
                    : "Save now"}
              <ArrowRight size={18} />
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => void close()}>
              Return to the road
            </Button>
          </section>
        ) : (
          <section className="account-section">
            <div className="save-times">
              <div>
                <span>Local checkpoint</span>
                <strong>{when(state.localSavedAt)}</strong>
              </div>
              <div>
                <span>Cloud acknowledgement</span>
                <strong>{when(state.cloudAcknowledgedAt)}</strong>
              </div>
            </div>
            <div className="account-actions">
              {state.user ? (
                <>
                  {!state.authRequired && (
                    <>
                      <Button disabled={busy} onClick={() => void run(() => cloud.checkpoint())}>
                        <Cloud />
                        Save now
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void run(() => cloud.refreshSession())}
                      >
                        <RefreshCw />
                        Refresh account
                      </Button>
                    </>
                  )}
                  {state.phase === "offline" && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void run(() => cloud.signIn())}
                    >
                      Sign in again
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  disabled={busy || state.phase === "checking"}
                  onClick={() => void run(() => cloud.signIn())}
                >
                  Continue with Google
                </Button>
              )}
            </div>
          </section>
        )}
        <SaveOptions
          compact={ember}
          recovery={state.reloadRequired || state.phase === "update-required"}
        >
          {ember &&
            !state.authRequired &&
            !conflict &&
            !state.reloadRequired &&
            state.phase !== "update-required" &&
            state.user && (
              <section className="account-section">
                <h3>Account connection</h3>
                <div className="account-actions">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void run(() => cloud.refreshSession())}
                  >
                    <RefreshCw />
                    Refresh account
                  </Button>
                  {state.phase === "offline" && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void run(() => cloud.signIn())}
                    >
                      Sign in again
                    </Button>
                  )}
                </div>
              </section>
            )}
          {!conflict &&
            !state.authRequired &&
            !state.reloadRequired &&
            (!ember || state.phase !== "update-required") &&
            state.user &&
            state.gameId && (
              <section className="account-section">
                <h3>
                  <History size={17} />
                  Cloud journeys
                </h3>
                {slots.length ? (
                  <>
                    <label htmlFor="cloud-slot">Saved journey</label>
                    <NativeSelect
                      id="cloud-slot"
                      value={slot}
                      disabled={busy}
                      onChange={(event) => {
                        setSlot(event.target.value);
                        setVersions([]);
                        setConfirm(null);
                      }}
                    >
                      {slots.map((item) => (
                        <option key={item.slotId} value={item.slotId}>
                          {item.metadata.title} · {when(item.updatedAt)}
                        </option>
                      ))}
                    </NativeSelect>
                    <div className="account-actions">
                      <Button
                        variant="outline"
                        disabled={busy || !slot}
                        onClick={() => void run(() => cloud.restore(slot))}
                      >
                        Review this journey
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy || !slot}
                        onClick={() => void run(async () => setVersions(await cloud.history(slot)))}
                      >
                        Recent versions
                      </Button>
                    </div>
                    {versions.length > 0 && (
                      <ul className="version-list">
                        {versions.map((item) => (
                          <li key={item.revision}>
                            <div>
                              <strong>
                                Version {item.revision}
                                {item.deleted ? " · removed" : ""}
                              </strong>
                              <small>{when(item.updatedAt)}</small>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy || item.deleted}
                              onClick={() => setConfirm(item)}
                            >
                              Restore
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {confirm && (
                      <div className="restore-confirm">
                        <p>
                          Restore version {confirm.revision}? It becomes the newest cloud
                          checkpoint. Your local save is kept as a recovery copy.
                        </p>
                        <div className="account-actions">
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await cloud.restoreVersion(confirm.slotId, confirm.revision);
                                setConfirm(null);
                              })
                            }
                          >
                            Restore this version
                          </Button>
                          <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p>No cloud journeys for this game yet.</p>
                )}
              </section>
            )}
          <section className="account-section">
            <h3>Keep a copy</h3>
            <p>Downloads contain the last persisted checkpoint.</p>
            <div className="account-actions">
              <Button
                variant="outline"
                disabled={busy || !state.localSavedAt}
                onClick={() => void run(() => download(cloud.exportLocal()))}
              >
                <Download />
                Download local save
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void run(() => download(cloud.exportRecovery()))}
              >
                Download recovery copy
              </Button>
            </div>
          </section>
          {state.user && !conflict && (
            <footer className="account-footer">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void run(() => cloud.signOut())}
              >
                <LogOut />
                Sign out
              </Button>
              <small>Guest and account journeys are kept separately.</small>
            </footer>
          )}
        </SaveOptions>
        {busy && (
          <p role="status" className="account-working">
            Working…
          </p>
        )}
      </NativeDialog>
    </div>
  );
}
export function mountAccountUi(cloud: PlayablesCloud) {
  const start = () => {
    const host = document.createElement("div");
    host.id = "playables-account-host";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles;
    shadow.append(style);
    const mount = document.createElement("div");
    shadow.append(mount);
    document.body.append(host);
    const place = () => {
      const anchor =
        document.querySelector("[data-playables-account-slot]") ||
        (cloud.getState().gameId === "war-chest"
          ? document.querySelector("header .controls")
          : cloud.getState().gameId === "idle-startup"
            ? document.querySelector("header.top")
            : null);
      if (anchor) {
        if (host.parentNode !== anchor) anchor.prepend(host);
        host.classList.remove("cloud-floating");
        return true;
      }
      host.classList.add("cloud-floating");
      return false;
    };
    const observer = new MutationObserver(() => {
      if (place()) observer.disconnect();
    });
    if (!place()) observer.observe(document.body, { childList: true, subtree: true });
    createRoot(mount).render(<Account cloud={cloud} />);
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
