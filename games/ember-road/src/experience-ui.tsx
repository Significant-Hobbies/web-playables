import { Button } from "@saas-maker/ui/components/button";
import { NativeDialog } from "@saas-maker/ui/components/native-controls";
import { ArrowRight, Flame, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AudioStatus } from "./audio";
import { PROLOGUE } from "./story";

export function StoryOpening({
  open,
  fresh,
  paused,
  audioStatus,
  audioPermitted,
  soundOn,
  audioControls,
  toggleSound,
  finish,
  skip,
}: {
  open: boolean;
  fresh: boolean;
  paused: boolean;
  audioStatus: AudioStatus;
  audioPermitted: boolean;
  soundOn: boolean;
  audioControls: boolean;
  toggleSound(): void;
  finish(start: boolean): void;
  skip(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
      node.querySelector<HTMLButtonElement>(`#prologue-next[data-scene="${step}"]`)?.focus();
    }
    if (!open && node.open) {
      node.close();
      setStep(0);
    }
  }, [open, step]);
  const scene = PROLOGUE[step]!;
  return (
    <NativeDialog
      ref={dialog}
      className={`story-opening ${paused ? "presentation-paused" : ""}`}
      aria-label="How the journey began"
      onCancel={(event) => {
        event.preventDefault();
        skip();
      }}
    >
      <div className="opening-topline">
        <span>
          <Flame /> EMBER ROAD
        </span>
        <div>
          {audioControls && (
            <Button
              variant="ghost"
              aria-label={soundOn ? "Mute opening sound" : "Enable opening sound"}
              onClick={toggleSound}
            >
              {soundOn ? <Volume2 /> : <VolumeX />}
              <span>Sound {soundOn ? "on" : "off"}</span>
            </Button>
          )}
          <Button variant="ghost" id="skip-prologue" onClick={skip}>
            Skip opening
          </Button>
        </div>
      </div>
      <div key={scene.id} className={`opening-scene opening-${scene.id}`}>
        <div className="opening-world" aria-hidden="true">
          <span className="opening-glow" />
          <span className="opening-actor opening-rook" />
          {!fresh && <span className="opening-actor opening-mira" />}
          {!fresh && <span className="opening-actor opening-cinder" />}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`opening-ember ember-${i}`} />
          ))}
        </div>
        <div className="opening-caption">
          <span className="opening-chapter">{scene.chapter}</span>
          <h1 id="prologue-title">{scene.title}</h1>
          <span className="opening-speaker">{scene.speaker}</span>
          <p>{scene.text}</p>
          {step === 2 && (
            <div className="opening-mission">
              <Flame />
              <span>
                FIRST MISSION
                <br />
                <strong>Recover the watchtower’s light.</strong>
              </span>
            </div>
          )}
          <Button
            id="prologue-next"
            data-scene={step}
            onClick={() => (step < PROLOGUE.length - 1 ? setStep(step + 1) : finish(fresh))}
          >
            {step === PROLOGUE.length - 1 && !fresh ? "Return to the company" : scene.next}
            <ArrowRight />
          </Button>
          <div className="opening-progress">
            <span>
              {step + 1} / {PROLOGUE.length}
            </span>
            {PROLOGUE.map((item, i) => (
              <i key={item.id} className={i <= step ? "lit" : ""} />
            ))}
          </div>
        </div>
      </div>
      <span className="opening-audio">
        <Volume2 />
        {!audioPermitted
          ? "Sound is muted in the player"
          : audioStatus === "locked"
            ? "Music begins with your first action"
            : audioStatus === "loading"
              ? "The last light is waking…"
              : audioStatus === "ready"
                ? "The Last Light · original score"
                : "Sound unavailable · the story continues"}
      </span>
    </NativeDialog>
  );
}
