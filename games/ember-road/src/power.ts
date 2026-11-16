import { type GameState, heroStats, rank, SKILLS } from "./model";

/** A comparative build rating, not damage or a promise of combat outcome. */
export function companyPower(state: GameState) {
  const s = heroStats(state);
  const skill = SKILLS.find((item) => item.id === state.meta.loadout.skill)!;
  const offense = Math.round(
    ((s.damage * (1 + s.crit * 0.8) * (1 + s.cleave + s.pierce)) / s.interval +
      (rank(state, "storm") * 18 + rank(state, "chain") * 28) / (3 * s.interval) +
      s.damage * rank(state, "execution") * 0.2) *
      8,
  );
  const defense = Math.round(
    s.hp * (0.5 + s.rangedResistance * 0.25) +
      s.armor * 10 +
      s.lifesteal * s.damage * 8 +
      rank(state, "thorns") * 15 +
      rank(state, "renewal") * s.hp * 0.08 +
      rank(state, "interrupt") * 15,
  );
  const company = Math.round(
    ((s.companionDamage / s.companionInterval) *
      (state.meta.loadout.companion === "sable" ? 3 : 1) +
      s.petDamage / s.petInterval) *
      8,
  );
  const technique = Math.round(
    ((skill.id === "aegis"
      ? s.hp * 0.3 + 24
      : s.damage * (skill.id === "volley" ? 1.75 : 1.35) * 2) /
      skill.cooldown) *
      8,
  );
  return { offense, defense, company, technique, total: offense + defense + company + technique };
}
