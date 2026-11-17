import { Button } from "@saas-maker/ui/components/button";
import { ArrowRight, Flame, RefreshCw, Sword } from "lucide-react";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { CHAPTERS, type GameState, PERKS, type PerkId, rank } from "./model";

const worlds = [
  new URL("../assets/oath-cinder-march-v1.webp", import.meta.url).href,
  new URL("../assets/oath-lantern-ruins-v1.webp", import.meta.url).href,
  new URL("../assets/oath-hollow-marsh-v1.webp", import.meta.url).href,
  new URL("../assets/oath-frostbound-keep-v1.webp", import.meta.url).href,
  new URL("../assets/oath-last-threshold-v1.webp", import.meta.url).href,
];
const summaries: Record<PerkId, string> = {
  edge: "+25% sword damage",
  tempo: "Attack 18% faster",
  blood: "Heal from Rook’s damage",
  heart: "+35 health · heal 35",
  bastion: "Take 3 less damage",
  storm: "Lightning every third strike",
  thorns: "Return 5 damage on hit",
  renewal: "Heal 8% after each wave",
  execution: "+40% damage to wounded foes",
  cleave: "Sweep across the front line",
  pierce: "Pierce the rear line",
  interrupt: "Cancel attacks every third strike",
  ward: "Take 35% less ranged damage",
  chain: "Lightning through the enemy ranks",
};
const relicCells: Record<PerkId, readonly [number, number, boolean]> = {
  bastion: [0, 0, true],
  storm: [1, 0, true],
  thorns: [2, 0, true],
  edge: [0, 0, false],
  tempo: [1, 0, false],
  blood: [2, 0, false],
  heart: [3, 0, false],
  renewal: [0, 1, false],
  execution: [1, 1, false],
  cleave: [2, 1, false],
  pierce: [3, 1, false],
  interrupt: [0, 2, false],
  ward: [1, 2, false],
  chain: [2, 2, false],
};

export function OathOffering({
  state,
  options,
  rerolls,
  choose,
  reroll,
  stats,
  powers,
  skip,
  children,
}: {
  state: GameState;
  options: readonly PerkId[];
  rerolls: number;
  choose(id: PerkId): void;
  reroll(): void;
  stats(): void;
  powers(): void;
  skip(): void;
  children: ReactNode;
}) {
  const [selection, setSelection] = useState<PerkId | null>(null);
  const offers = useRef<HTMLElement>(null);
  const selected =
    PERKS.find((p) => p.id === selection && options.includes(p.id)) ??
    PERKS.find((p) => p.id === options[0])!;
  useLayoutEffect(() => {
    const row = offers.current;
    const button = row?.querySelector<HTMLButtonElement>(`[data-oath="${selected.id}"]`);
    if (!row || !button || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft +=
      button.getBoundingClientRect().left -
      row.getBoundingClientRect().left -
      (row.clientWidth - button.clientWidth) / 2;
  }, [selected.id]);
  return (
    <section
      className="oath-stage"
      aria-label="A gift for the road"
      style={{ "--offering-world": `url("${worlds[state.run.chapter - 1]}")` } as CSSProperties}
    >
      <div className="offering-hud">
        <span>{CHAPTERS[state.run.chapter - 1]!.place}</span>
        <span>◆ JOURNEY LEVEL {state.run.level}</span>
      </div>
      <header className="shrine-heading">
        <span className="eyebrow">THE OLD SHRINE ANSWERS</span>
        <h2>A gift for the road</h2>
        <p>One power. Yours until the journey ends.</p>
      </header>
      <section ref={offers} className="shrine-offerings" aria-label="Oath offerings">
        {options.map((id, index) => {
          const perk = PERKS.find((p) => p.id === id)!;
          const [column, row, relic] = relicCells[id];
          return (
            <Button
              key={id}
              variant="ghost"
              className={`shrine-offer rarity-${perk.rarity} ${selected.id === id ? "selected" : ""}`}
              data-oath={id}
              aria-pressed={selected.id === id}
              aria-label={`Inspect ${perk.title}, ${perk.rarity}, rank ${rank(state, id) + 1} of ${perk.max}`}
              onClick={() => setSelection(id)}
              style={{ "--offer-delay": `${index * 100}ms` } as CSSProperties}
            >
              <span className="offering-light" />
              <span className="offering-object">
                <span
                  className={`perk-art painted-relic ${relic ? "relic-atlas" : "power-atlas"}`}
                  aria-hidden="true"
                  style={{ backgroundPosition: `${column * (relic ? 50 : 100 / 3)}% ${row * 50}%` }}
                />
              </span>
              <span className="stone-plinth" />
              <span className="offering-copy">
                <span className="offering-rarity">
                  <i />
                  {perk.rarity}
                </span>
                <strong>{perk.title}</strong>
                <span className="short-effect">{summaries[id]}</span>
                <span className="offering-rank">
                  <span aria-hidden="true">
                    {Array.from({ length: perk.max }, (_, n) => n + 1).map((n) => (
                      <i key={n} className={n <= rank(state, id) + 1 ? "filled" : ""} />
                    ))}
                  </span>
                  <small>
                    RANK {rank(state, id) + 1} / {perk.max}
                  </small>
                </span>
              </span>
              <kbd aria-label={`Press ${index + 1} to bind immediately`}>{index + 1}</kbd>
            </Button>
          );
        })}
      </section>
      <div className={`shrine-binding rarity-${selected.rarity}`}>
        <span className="binding-label">{selected.caption}</span>
        <Button
          autoFocus
          className="take-oath"
          data-perk={selected.id}
          onClick={() => choose(selected.id)}
        >
          Take {selected.title}
          <ArrowRight />
        </Button>
        <p className="selected-effect">{selected.description}</p>
      </div>
      <div className="offering-footer">
        <div className="choice-tools">
          <Button variant="ghost" data-reroll="" onClick={reroll} disabled={rerolls <= 0}>
            <RefreshCw />
            {rerolls > 0 ? "Reroll" : "Reroll used"}
            {rerolls > 0 && <small>1 free</small>}
          </Button>
          <Button variant="ghost" onClick={stats}>
            <Sword />
            Current stats
          </Button>
          <Button variant="ghost" onClick={powers}>
            <Flame />
            Current powers
          </Button>
          <Button
            variant="ghost"
            id="skip-perk"
            aria-label="Skip this choice"
            title="Continue without taking a power"
            onClick={skip}
          >
            Leave the offering
            <ArrowRight />
          </Button>
        </div>
        {children}
      </div>
    </section>
  );
}
