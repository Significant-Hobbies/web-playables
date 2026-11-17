import { Button } from "@saas-maker/ui/components/button";
import { Shield, Swords, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { type CommandId, enemyIntent, type GameState, SKILLS } from "./model";

export function CombatCommands({
  state,
  paused,
  skillReady,
  command,
  skill,
}: {
  state: GameState;
  paused: boolean;
  skillReady: boolean;
  command(id: CommandId): void;
  skill(): void;
}) {
  const battle = state.phase.kind === "battle" ? state.phase : null;
  const commands = battle?.commands;
  const equipped = SKILLS.find((s) => s.id === state.meta.loadout.skill)!;
  const actions = [
    {
      id: "brace",
      label: "Brace",
      key: "W",
      cooldown: commands?.braceCooldown ?? 0,
      duration: 3.2,
      icon: Shield,
      hint: "Raise your guard for 0.9s. Brace just before contact to take no damage and counterstrike.",
      fire: () => command("brace"),
    },
    {
      id: "breakthrough",
      label: "Breakthrough",
      key: "E",
      cooldown: commands?.breakthroughCooldown ?? 0,
      duration: 6.5,
      icon: Swords,
      hint: "Lunge at a rear threat. Interrupt a channel for bonus damage and focus that enemy.",
      fire: () => command("breakthrough"),
    },
    ...(skillReady
      ? [
          {
            id: "skill",
            label: equipped.name,
            key: "Q",
            cooldown: state.run.skillCooldown,
            duration: equipped.cooldown,
            icon: Zap,
            hint: equipped.description,
            fire: skill,
          },
        ]
      : []),
  ];
  return (
    <fieldset className="command-deck" aria-label="Combat commands">
      {actions.map((action) => (
        <Button
          key={action.id}
          className={`combat-command command-${action.id} ${action.id === "brace" && commands?.brace ? "is-bracing" : ""}`}
          disabled={paused || !battle || action.cooldown > 0}
          onClick={action.fire}
          title={action.hint}
          aria-label={`${action.label} ${action.key}`}
          style={
            {
              "--command-ready": `${100 * (1 - action.cooldown / action.duration)}%`,
            } as CSSProperties
          }
        >
          <action.icon />
          <span>
            {action.label}
            <small>
              {action.cooldown > 0
                ? `${action.cooldown.toFixed(1)}s`
                : action.id === "brace"
                  ? "Time the impact"
                  : action.id === "breakthrough"
                    ? "Break a channel"
                    : "Ready"}
            </small>
          </span>
          <kbd>{action.key}</kbd>
        </Button>
      ))}
    </fieldset>
  );
}

export function ThreatReadout({ state }: { state: GameState }) {
  if (state.phase.kind !== "battle" || !state.phase.commands) return null;
  const battle = state.phase;
  const commands = battle.commands!;
  const threat = battle.enemies
    .filter((e) => e.hp > 0 && e.pendingHit)
    .sort((a, b) => a.pendingHit!.remaining - b.pendingHit!.remaining)[0];
  const intent = threat && enemyIntent(threat);
  return (
    <div className={`combat-readout ${commands.exposed > 0 ? "is-exposed" : ""}`}>
      <div className="combat-feedback" role="status">
        {commands.feedbackTime > 0
          ? commands.feedback
          : commands.exposed > 0
            ? "EXPOSED · incoming damage increased"
            : "Read the windup. Make the opening yours."}
      </div>
      {threat && intent && (
        <div className={`incoming-threat threat-${threat.kind}`}>
          <span>
            {threat.name} <strong>{intent.label}</strong>
          </span>
          <span>
            {threat.kind === "hexer" || threat.kind === "sentinel"
              ? "E · Interrupt"
              : "W · Brace at contact"}
          </span>
          <progress
            aria-label={`${threat.name} ${intent.label} windup`}
            max={threat.pendingHit!.windup ?? intent.windup}
            value={(threat.pendingHit!.windup ?? intent.windup) - threat.pendingHit!.remaining}
          />
        </div>
      )}
    </div>
  );
}
