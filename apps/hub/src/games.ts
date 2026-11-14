export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  status: "live" | "soon";
  engine?: "godot";
}

export const GAMES: GameMeta[] = [
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
