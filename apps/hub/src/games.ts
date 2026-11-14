export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  status: "live" | "soon";
  engine?: "godot";
  entry?: string;
}

export const GAMES: GameMeta[] = [
  {
    id: "ember-road",
    title: "Ember Road",
    tagline: "Forge your knight. Choose your oaths. Walk one road further.",
    emoji: "🔥",
    status: "live",
    entry: "games/ember-road/entry.md",
  },
  {
    id: "war-chest",
    title: "War Chest",
    tagline: "Defend the crossing. Pack your gear. Bring the company home.",
    emoji: "⚔️",
    status: "live",
    engine: "godot",
  },
  {
    id: "idle-startup",
    title: "Idle Startup",
    tagline: "Ship features. Hire the team. Raise the round.",
    emoji: "🚀",
    status: "live",
  },
];
