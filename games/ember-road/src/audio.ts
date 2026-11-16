import { type AudioPreferences, sliderGain } from "./experience";
import type { GameEvent, GameState } from "./model";

export type AudioStatus = "locked" | "loading" | "ready" | "effects-only" | "unavailable";
export type SoundCue =
  | "slash"
  | "heavy"
  | "pierce"
  | "arrow"
  | "hurt"
  | "pet"
  | "critical"
  | "skill"
  | "whirlwind"
  | "volley"
  | "aegis"
  | "kill"
  | "oath"
  | "victory"
  | "defeat"
  | "forge"
  | "claim"
  | "equip"
  | "page";
const musicUrls = [
  new URL("../assets/ember-hearth.ogg", import.meta.url).href,
  new URL("../assets/ember-road.ogg", import.meta.url).href,
];
export function eventCue(event: GameEvent, state: GameState): SoundCue | null {
  if (event.type === "hit") {
    if (event.effect === "shatterguard") return "pierce";
    if (event.effect === "storm-relay") return "critical";
    if (event.target === "hero") return "hurt";
    if (event.critical || event.lightning) return "critical";
    if (event.actor === "pet") return state.meta.loadout.pet === "owl" ? "arrow" : "pet";
    if (event.actor === "companion")
      return state.meta.loadout.companion === "bram" ? "slash" : "arrow";
    return state.meta.loadout.weapon === "greatsword"
      ? "heavy"
      : state.meta.loadout.weapon === "spear"
        ? "pierce"
        : "slash";
  }
  if (event.type === "skill") return event.skill;
  if (event.type === "kill" || event.type === "victory" || event.type === "defeat")
    return event.type;
  return null;
}
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private layer: GainNode | null = null;
  private voices = new Set<AudioBufferSourceNode>();
  private buffers = new Map<string, AudioBuffer>();
  private sources: AudioBufferSourceNode[] = [];
  private loading: Promise<void> | null = null;
  private activated = false;
  private preferences: AudioPreferences;
  private policy = { paused: false, permitted: true, inspecting: false, battle: false };
  private status: AudioStatus = "locked";
  private takes = new Map<SoundCue, number>();
  private lastImpact = -1;
  private lastCoin = -1;
  constructor(
    preferences: AudioPreferences,
    private readonly notify: (status: AudioStatus) => void,
  ) {
    this.preferences = preferences;
  }
  private report(status: AudioStatus) {
    if (status !== this.status) {
      this.status = status;
      this.notify(status);
    }
  }
  async unlock() {
    if (this.status === "unavailable") return;
    this.activated = true;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        const ctx = this.context;
        this.master = ctx.createGain();
        this.music = ctx.createGain();
        this.effects = ctx.createGain();
        this.layer = ctx.createGain();
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        this.music.connect(this.master);
        this.effects.connect(this.master);
        this.layer.connect(this.music);
        this.master.connect(limiter);
        limiter.connect(ctx.destination);
        this.master.gain.value = 0;
      } catch {
        if (this.context) void this.context.close().catch(() => {});
        this.context = null;
        this.report("unavailable");
        return;
      }
    }
    this.mix();
    if (this.policy.paused || !this.policy.permitted) {
      void this.context.suspend().catch(() => {});
      return;
    }
    try {
      await this.context.resume();
    } catch {
      return;
    }
    if (!this.loading) {
      this.report("loading");
      this.loading = this.loadMusic();
    }
    await this.loading;
  }
  update(preferences: AudioPreferences, policy: typeof this.policy) {
    this.preferences = preferences;
    this.policy = policy;
    this.mix();
    const ctx = this.context;
    if (!ctx) return;
    if (policy.paused || !policy.permitted) {
      void ctx.suspend().catch(() => {});
    } else if (this.activated && this.status === "locked") {
      void this.unlock();
    } else if (this.status !== "locked" && this.status !== "unavailable") {
      void ctx.resume().catch(() => {});
    }
  }
  private mix() {
    const ctx = this.context;
    if (!ctx || !this.master || !this.music || !this.effects || !this.layer) return;
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.policy.permitted && !this.policy.paused ? 0.8 : 0, t);
    this.music.gain.setTargetAtTime(
      this.preferences.musicEnabled
        ? sliderGain(this.preferences.musicVolume) * (this.policy.inspecting ? 0.5 : 0.8)
        : 0,
      t,
      0.25,
    );
    this.effects.gain.setTargetAtTime(
      this.preferences.effectsEnabled ? sliderGain(this.preferences.effectsVolume) * 0.65 : 0,
      t,
      0.02,
    );
    this.layer.gain.setTargetAtTime(
      this.policy.battle && !this.policy.inspecting ? 0.7 : 0,
      t,
      0.6,
    );
  }
  private async loadMusic() {
    const ctx = this.context;
    if (!ctx || !this.music || !this.layer) return;
    try {
      const buffers = await Promise.all(
        musicUrls.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Music unavailable");
          return ctx.decodeAudioData(await response.arrayBuffer());
        }),
      );
      if (Math.abs(buffers[0]!.duration - buffers[1]!.duration) > 0.06)
        throw new Error("Music layers differ");
      const start = ctx.currentTime + 0.03;
      buffers.forEach((buffer, index) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(index === 0 ? this.music! : this.layer!);
        source.start(start);
        this.sources.push(source);
      });
      this.report("ready");
      this.mix();
      if (this.policy.paused || !this.policy.permitted) await ctx.suspend();
    } catch {
      this.report("effects-only");
    }
  }
  handle(events: GameEvent[], state: GameState) {
    for (const event of events) {
      const cue = eventCue(event, state);
      if (cue) this.play(cue);
    }
  }
  play(cue: SoundCue) {
    const ctx = this.context;
    if (
      !ctx ||
      ctx.state !== "running" ||
      !this.effects ||
      !this.preferences.effectsEnabled ||
      this.policy.paused ||
      !this.policy.permitted ||
      this.voices.size >= 8
    )
      return;
    if (
      this.policy.inspecting &&
      ["slash", "heavy", "pierce", "arrow", "hurt", "pet", "critical", "kill"].includes(cue)
    )
      return;
    const t = ctx.currentTime;
    if (["slash", "heavy", "pierce", "arrow", "hurt", "pet"].includes(cue)) {
      if (t - this.lastImpact < 0.09) return;
      this.lastImpact = t;
    }
    if (cue === "kill") {
      if (t - this.lastCoin < 0.2) return;
      this.lastCoin = t;
    }
    const take = ((this.takes.get(cue) ?? -1) + 1) % 4;
    this.takes.set(cue, take);
    const key = `${cue}:${take}`;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = this.makeCue(cue, take);
      this.buffers.set(key, buffer);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.97 + take * 0.02;
    source.connect(this.effects);
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      this.voices.delete(source);
    };
    source.start();
  }
  private makeCue(cue: SoundCue, take: number) {
    const ctx = this.context!;
    const melodic = [
      "kill",
      "oath",
      "victory",
      "defeat",
      "forge",
      "claim",
      "equip",
      "page",
      "aegis",
    ].includes(cue);
    const duration =
      cue === "victory"
        ? 1.5
        : cue === "defeat"
          ? 1.2
          : ["skill", "whirlwind", "volley"].includes(cue)
            ? 0.5
            : cue === "heavy"
              ? 0.22
              : melodic
                ? 0.45
                : 0.14;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 5731 + take * 31;
    let low = 0;
    const notes =
      cue === "victory"
        ? [293.66, 349.23, 440, 587.33]
        : cue === "defeat"
          ? [293.66, 261.63, 220]
          : cue === "oath" || cue === "claim"
            ? [440, 587.33, 698.46]
            : cue === "forge"
              ? [196, 293.66, 392]
              : [440, 587.33];
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      low += (noise - low) * 0.13;
      const envelope =
        Math.min(1, t / 0.005) *
        Math.exp(
          -t *
            (melodic
              ? 7
              : ["skill", "whirlwind", "volley"].includes(cue)
                ? 8
                : cue === "heavy"
                  ? 24
                  : 35),
        );
      if (melodic) {
        let value = 0;
        for (let n = 0; n < notes.length; n++) {
          const at = t - n * (cue === "victory" ? 0.16 : 0.07);
          if (at >= 0)
            value +=
              Math.sin(at * notes[n]! * Math.PI * 2) * Math.exp(-at * 8) * Math.min(1, at / 0.008);
        }
        data[i] = value * (cue === "page" ? 0.025 : cue === "kill" ? 0.035 : 0.07);
      } else {
        const frequency =
          cue === "hurt"
            ? 110
            : cue === "pet"
              ? 180
              : cue === "critical"
                ? 520
                : cue === "arrow" || cue === "pierce" || cue === "volley"
                  ? 840
                  : cue === "heavy"
                    ? 120
                    : 380;
        const tone = Math.sin(
          (frequency / 4) * (1 + take * 0.035) * Math.PI * 2 * (1 - Math.exp(-t * 4)),
        );
        data[i] =
          (low * (cue === "skill" || cue === "whirlwind" ? 0.5 : 0.3) +
            tone * (cue === "heavy" ? 0.18 : 0.1)) *
          envelope *
          (cue === "volley" ? 0.55 + 0.45 * Math.cos(t * Math.PI * 16) : 1);
      }
    }
    return buffer;
  }
}
