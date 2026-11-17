import { type GameState, issueCommand } from "./model";

export function answerThreats(state: GameState) {
  if (state.phase.kind !== "battle") return;
  const threats = state.phase.enemies.filter((enemy) => enemy.hp > 0 && enemy.pendingHit);
  if (threats.some((enemy) => enemy.pendingHit!.remaining < 0.2)) issueCommand(state, "brace");
  if (threats.some((enemy) => enemy.kind === "hexer" || enemy.kind === "sentinel"))
    issueCommand(state, "breakthrough");
}
