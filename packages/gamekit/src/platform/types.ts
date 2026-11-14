export type Unsubscribe = () => void;

/**
 * The only surface a game may use for persistence, audio policy, pause, and
 * ready signals. Keeping game code on this interface is what makes the same
 * build embeddable on the web and certifiable on YouTube Playables.
 */
export interface Platform {
  readonly env: "web" | "yt";
  /** YT certification forbids an in-game master mute control. */
  readonly allowsMuteUi: boolean;

  /** Call when the first frame has actually painted (loading screen up). */
  firstFrameReady(): void;
  /** Call when the game is interactive. */
  gameReady(): void;

  /** Resolves null when no save exists. */
  loadData(): Promise<string | null>;
  saveData(data: string): Promise<void>;

  /** Optional web host asks the game to persist a fresh checkpoint before account actions. */
  onSaveRequest?(callback: () => void | Promise<void>): Unsubscribe;

  audioEnabled(): boolean;
  onAudioEnabledChange(cb: (enabled: boolean) => void): Unsubscribe;

  /** true → halt ALL execution (loop, timers, animation); false → resume. */
  onPauseChange(cb: (paused: boolean) => void): Unsubscribe;
}
