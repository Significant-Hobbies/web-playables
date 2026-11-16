import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as A from "../src/adventures.ts";
import * as M from "../src/model.ts";
import { useSkill as castSkill } from "../src/model.ts";
import * as Q from "../src/quests.ts";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const samples = Number(option("--samples", "12"));
assert(
  Number.isInteger(samples) && samples >= 2 && samples <= 24,
  "Use 2–24 deterministic samples",
);
const clone = structuredClone;
const fixedDay = Math.floor(Date.UTC(2026, 10, 16) / A.DAY_MS);
const builds = {
  balanced: {
    gear: { weapon: "sword", armor: "mail", companion: "mira", pet: "fox", skill: "whirlwind" },
    perks: [
      "renewal",
      "blood",
      "heart",
      "edge",
      "bastion",
      "cleave",
      "tempo",
      "execution",
      "storm",
      "pierce",
      "ward",
      "thorns",
      "chain",
      "interrupt",
    ],
  },
  shatter: {
    gear: { weapon: "sword", armor: "plate", companion: "bram", pet: "hound", skill: "aegis" },
    perks: [
      "thorns",
      "bastion",
      "heart",
      "renewal",
      "blood",
      "interrupt",
      "edge",
      "tempo",
      "ward",
      "cleave",
      "execution",
      "storm",
      "pierce",
      "chain",
    ],
  },
  storm: {
    gear: { weapon: "spear", armor: "cloak", companion: "sable", pet: "owl", skill: "volley" },
    perks: [
      "chain",
      "storm",
      "pierce",
      "tempo",
      "edge",
      "execution",
      "blood",
      "renewal",
      "heart",
      "ward",
      "cleave",
      "bastion",
      "interrupt",
      "thorns",
    ],
  },
  hunter: {
    gear: { weapon: "sword", armor: "cloak", companion: "mira", pet: "fox", skill: "volley" },
    perks: [
      "execution",
      "tempo",
      "edge",
      "blood",
      "heart",
      "ward",
      "pierce",
      "renewal",
      "cleave",
      "storm",
      "chain",
      "bastion",
      "interrupt",
      "thorns",
    ],
  },
  vanguard: {
    gear: { weapon: "greatsword", armor: "plate", companion: "bram", pet: "hound", skill: "aegis" },
    perks: [
      "cleave",
      "edge",
      "heart",
      "bastion",
      "renewal",
      "blood",
      "thorns",
      "tempo",
      "execution",
      "interrupt",
      "ward",
      "storm",
      "pierce",
      "chain",
    ],
  },
  confluence: {
    gear: { weapon: "spear", armor: "cloak", companion: "mira", pet: "fox", skill: "aegis" },
    perks: [
      "thorns",
      "storm",
      "chain",
      "tempo",
      "blood",
      "heart",
      "renewal",
      "edge",
      "pierce",
      "ward",
      "execution",
      "bastion",
      "cleave",
      "interrupt",
    ],
  },
  backline: {
    gear: { weapon: "spear", armor: "cloak", companion: "sable", pet: "owl", skill: "volley" },
    perks: [
      "pierce",
      "ward",
      "chain",
      "storm",
      "edge",
      "tempo",
      "blood",
      "bastion",
      "heart",
      "renewal",
      "execution",
      "cleave",
      "interrupt",
      "thorns",
    ],
  },
};

const entries = Object.entries(builds);
const fixture = JSON.parse(
  await readFile(new URL("../test-fixtures/earned-progression.v4.json", import.meta.url), "utf8"),
);
assert.equal(fixture.version, 4);
const checkpoints = fixture.checkpoints.map((state) => M.migrateV4State(state));
for (const state of checkpoints)
  assert(M.validState(state), "The earned entry checkpoint migrates safely");

function recordEvents(state, events, stats, now) {
  for (const e of events) {
    if (e.type === "hit") {
      if (e.side === "hero") {
        stats.damageTaken += e.damage;
        stats.enemyHits++;
      } else {
        stats.damageDealt += e.damage;
        stats.damageByActor[e.actor] = (stats.damageByActor[e.actor] ?? 0) + e.damage;
      }
    }
    if (e.type === "heal") stats.healing += e.amount;
    if (e.type === "skill") stats.casts++;
    if (e.type === "interrupt") stats.interrupts++;
    if (e.type === "swing" && e.side === "enemy") stats.enemySwings++;
    if (e.type === "synergy" || e.type === "combo") {
      const id = e.synergy ?? e.combo ?? e.effect ?? "unknown";
      stats.combos[id] = (stats.combos[id] ?? 0) + 1;
    }
    if (e.type === "kill" || e.type === "skill") Q.recordQuestProgress(state.quests, e, now);
    if (e.type === "victory" && state.run.context?.kind === "campaign")
      Q.recordQuestProgress(state.quests, { type: "victory", chapter: state.run.chapter }, now);
  }
}

function castAllowed(state, policy) {
  if (policy === "skip" || state.phase.kind !== "battle" || state.run.skillCooldown > 0)
    return false;
  if (policy === "immediate") return true;
  const foes = state.phase.enemies.filter((e) => e.hp > 0);
  if (state.meta.loadout.skill === "aegis")
    return state.run.shield === 0 && foes.some((e) => e.pendingHit && e.pendingHit.remaining < 0.4);
  if (state.meta.loadout.skill === "volley")
    return foes.some((e) => e.row === "back" && e.pendingHit);
  return (
    foes.filter((e) => e.row === "front").length >= 2 ||
    foes.some((e) => e.hp < M.heroStats(state).damage)
  );
}

function finish(state, build, policy, now, validate = true) {
  const stats = {
    seconds: 0,
    combatSeconds: 0,
    minHp: state.run.hp,
    minHpRatio: 1,
    damageTaken: 0,
    damageDealt: 0,
    healing: 0,
    casts: 0,
    interrupts: 0,
    enemyHits: 0,
    enemySwings: 0,
    damageByActor: {},
    combos: {},
    oaths: [],
  };
  let lastPhase = state.phase.kind;
  for (let frame = 0; frame < 18_000; frame++) {
    if (["victory", "defeat"].includes(state.phase.kind)) break;
    if (state.phase.kind === "choice") {
      const pick =
        build.perks.find((id) => state.phase.options.includes(id)) ?? state.phase.options[0];
      assert(M.choosePerk(state, pick));
      Q.recordQuestProgress(state.quests, { type: "oath" }, now);
      stats.oaths.push(pick);
    }
    if (state.phase.kind === "route")
      assert(
        M.chooseRoute(
          state,
          state.phase.at === 3 ? "rescue" : state.phase.at === 6 ? "shrine" : "tracks",
        ),
      );
    const events = [];
    if (castAllowed(state, policy)) events.push(...castSkill(state));
    if (state.phase.kind === "battle") stats.combatSeconds += 1 / 30;
    events.push(...M.stepGame(state, 1 / 30));
    recordEvents(state, events, stats, now);
    stats.seconds += 1 / 30;
    stats.minHp = Math.min(stats.minHp, state.run.hp);
    stats.minHpRatio = Math.min(stats.minHpRatio, state.run.hp / M.heroStats(state).hp);
    const transition = lastPhase !== state.phase.kind;
    if (validate && (transition || frame % 90 === 0))
      assert(M.validState(state), `Invalid ${state.phase.kind} frame ${frame}`);
    lastPhase = state.phase.kind;
  }
  assert(["victory", "defeat"].includes(state.phase.kind), "Finite combat resolution");
  assert(M.validState(state));
  return {
    ...stats,
    win: state.phase.kind === "victory",
    cleared: state.run.cleared,
    endingHp: state.run.hp,
    perks: state.run.perks,
  };
}

const scenarios = [];
for (let chapter = 1; chapter <= 5; chapter++)
  scenarios.push({ name: `campaign-${chapter}`, kind: "campaign", chapter, entry: chapter });
for (const kind of ["daily", "hunt"])
  for (const tier of [1, 2, 3])
    for (let style = 0; style < 5; style++) {
      const chapter = A.TIERS[tier - 1].chapter;
      scenarios.push({
        name: `${kind}-${tier}-${style}`,
        kind,
        tier,
        style,
        entry: Math.max(kind === "daily" ? 2 : 3, chapter),
      });
    }
const results = [];
for (const scenario of scenarios)
  for (const [buildName, build] of entries)
    for (const policy of ["immediate", "tactical", "skip"])
      for (let sample = 0; sample < samples; sample++) {
        const state = clone(checkpoints[scenario.entry - 1]);
        const before = JSON.stringify(state.meta.progression);
        for (const [slot, id] of Object.entries(build.gear)) M.equip(state, slot, id);
        assert.equal(
          JSON.stringify(state.meta.progression),
          before,
          "Loadout comparison adds no currencies or training",
        );
        const loadout = clone(state.meta.loadout);
        let now = fixedDay * A.DAY_MS;
        if (scenario.kind === "campaign") {
          state.run.seed = (927113 + sample * 104729) >>> 0;
          assert(M.startRun(state, scenario.chapter));
        } else {
          const basePeriod = scenario.kind === "daily" ? fixedDay : Math.floor((fixedDay + 3) / 7);
          const period = basePeriod + ((scenario.style - (basePeriod % 5) + 5) % 5) + 5 * sample;
          now = (scenario.kind === "daily" ? period : period * 7 - 3) * A.DAY_MS;
          A.advanceAdventures(state, now);
          const offer = A.activityPreview(state, scenario.kind, scenario.tier);
          assert.equal(offer.id, scenario.style);
          assert(M.startActivity(state, scenario.kind, scenario.tier, offer.period, offer.id, now));
        }
        const stats = finish(state, build, policy, now);
        results.push({
          scenario: scenario.name,
          kind: scenario.kind,
          entry: scenario.entry,
          build: buildName,
          policy,
          sample,
          loadout,
          ...stats,
        });
      }

const quantile = (values, q) => {
  const a = [...values].sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.floor(a.length * q))];
};
const groups = [];
for (const scenario of scenarios)
  for (const build of entries.map(([name]) => name))
    for (const policy of ["immediate", "tactical", "skip"]) {
      const runs = results.filter(
        (r) => r.scenario === scenario.name && r.build === build && r.policy === policy,
      );
      const wins = runs.filter((r) => r.win);
      groups.push({
        scenario: scenario.name,
        entry: scenario.entry,
        build,
        policy,
        runs: runs.length,
        wins: wins.length,
        winRate: wins.length / runs.length,
        medianSeconds: wins.length
          ? quantile(
              wins.map((r) => r.seconds),
              0.5,
            )
          : null,
        medianMinHpRatio: quantile(
          runs.map((r) => r.minHpRatio),
          0.5,
        ),
        p10MinHpRatio: quantile(
          runs.map((r) => r.minHpRatio),
          0.1,
        ),
        medianDamageTaken: quantile(
          runs.map((r) => r.damageTaken),
          0.5,
        ),
        medianHealing: quantile(
          runs.map((r) => r.healing),
          0.5,
        ),
        medianEnemyHits: quantile(
          runs.map((r) => r.enemyHits),
          0.5,
        ),
      });
    }
const active = groups.filter((g) => g.policy !== "skip");
for (const scenario of scenarios) {
  const viable = Object.keys(builds).filter((build) =>
    active.some((g) => g.scenario === scenario.name && g.build === build && g.winRate >= 0.5),
  );
  assert(
    viable.length >= 2,
    `${scenario.name} needs at least two viable builds at its earned entry budget`,
  );
}
const primary = groups.filter((g) => g.scenario === "campaign-5" && g.policy === "tactical");
assert(
  primary.every((g) => g.winRate >= 0.75),
  "Every supported archetype must remain viable at first earned chapter-five entry",
);
const winningTimes = primary.map((g) => g.medianSeconds);
assert(
  Math.max(...winningTimes) / Math.min(...winningTimes) < 2,
  "Campaign-five archetypes must not differ by more than 2x in median clear time",
);
const fastest = [...primary].sort((a, b) => a.medianSeconds - b.medianSeconds)[0];
assert(
  primary.some(
    (g) =>
      g.medianSeconds > fastest.medianSeconds + 0.1 &&
      g.medianMinHpRatio > fastest.medianMinHpRatio + 0.01,
  ),
  "Faster clearing must leave a meaningful survival tradeoff",
);
const report = {
  sourceFixture: fixture.sourceCommit,
  runtime: process.version,
  samples,
  scenarios: scenarios.length,
  builds: entries.length,
  policies: 3,
  totalRuns: results.length,
  wins: results.filter((r) => r.win).length,
  primary,
  groups,
  runs: results,
};
const out = option("--output");
if (out) await writeFile(resolve(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `BALANCE passed: ${results.length} runs, ${scenarios.length} scenarios, ${entries.length} builds, ${samples} samples, Node ${process.version}.`,
);
for (const g of primary)
  console.log(
    `${g.build}: ${g.wins}/${g.runs} wins; median ${g.medianSeconds.toFixed(1)}s; minimum-health median ${(g.medianMinHpRatio * 100).toFixed(1)}%.`,
  );
