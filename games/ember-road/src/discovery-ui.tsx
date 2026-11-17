import { Button } from "@saas-maker/ui/components/button";
import { ArrowRight, Check, Flame, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { type DiscoveryId, journalDiscoveries } from "./discoveries";
import { LoadoutArt } from "./loadout-art";
import { CHAPTERS, type GameState } from "./model";
import { journeyStory } from "./story";

export function DiscoveryJournal({
  state,
  onPlan,
  onVisit,
}: {
  state: GameState;
  onPlan(chapter: number): void;
  onVisit(id: DiscoveryId): void;
}) {
  const discoveries = journalDiscoveries(state);
  const [selected, setSelected] = useState<DiscoveryId | null>(null);
  const active =
    discoveries.find((d) => d.id === selected) ??
    discoveries.find((d) => !d.found) ??
    discoveries[0]!;
  return (
    <section className="discovery-journal" aria-label="Discoveries of the old road">
      <section className="valley-beacons" aria-label="Lights restored in the valley">
        <div>
          <span className="sheet-kicker">THE VALLEY REMEMBERS</span>
          <p>Every chapter you complete brings another light home.</p>
        </div>
        <ol>
          {CHAPTERS.map((chapter, index) => {
            const lit = state.quests.story.completed.includes(index + 1);
            return (
              <li
                key={chapter.name}
                className={lit ? "is-lit" : ""}
                title={lit ? journeyStory(index + 1).outcome : journeyStory(index + 1).goal}
              >
                <Flame aria-hidden="true" />
                <span>{chapter.name}</span>
                <small>{lit ? "Light restored" : `Chapter ${index + 1}`}</small>
              </li>
            );
          })}
        </ol>
      </section>
      <nav className="discovery-tabs" aria-label="Discovery trails">
        {discoveries.map((discovery) => (
          <Button
            key={discovery.id}
            variant="ghost"
            aria-pressed={active.id === discovery.id}
            onClick={() => setSelected(discovery.id)}
          >
            {discovery.found ? (
              <Check size={15} />
            ) : !discovery.available ? (
              <LockKeyhole size={15} />
            ) : (
              <Flame size={15} />
            )}
            {discovery.character}
            <small>
              {discovery.found
                ? "Found"
                : discovery.available
                  ? "Follow the clue"
                  : `Chapter ${discovery.chapter}`}
            </small>
          </Button>
        ))}
      </nav>
      <article
        className={`discovery-feature discovery-${active.id} ${active.found ? "is-found" : ""}`}
        data-discovery={active.id}
      >
        <div className="discovery-illustration" aria-hidden="true">
          <span className="discovery-halo" />
          {active.id === "whirlwind" ? (
            <LoadoutArt slot="skill" id="whirlwind" />
          ) : (
            <span className={`discovery-character portrait-${active.id}`} />
          )}
          <span className="discovery-caption">
            {active.found
              ? "A PART OF YOUR STORY"
              : active.id === "whirlwind"
                ? "A FORM WORTH LEARNING"
                : "SOMEONE WORTH FINDING"}
          </span>
        </div>
        <div className="discovery-story">
          <span className="sheet-kicker">
            {active.found
              ? "A PERMANENT DISCOVERY"
              : `CHAPTER ${active.chapter} · AFTER FIGHT ${active.at}`}
          </span>
          <h2>{active.name}</h2>
          <p className="discovery-clue">{active.found ? active.memory : active.clue}</p>
          {!active.found && (
            <p className="discovery-directions">
              <ArrowRight size={17} />
              {active.route}
            </p>
          )}
          <p className="discovery-outcome">{active.outcome}</p>
          {active.found ? (
            <Button onClick={() => onVisit(active.id)}>
              Visit {active.id === "whirlwind" ? "your skills" : active.character}{" "}
              <ArrowRight size={17} />
            </Button>
          ) : (
            <Button
              disabled={!active.available || state.phase.kind !== "camp"}
              onClick={() => onPlan(active.chapter)}
            >
              {!active.available
                ? `Open chapter ${active.chapter} first`
                : state.phase.kind !== "camp"
                  ? "Return to camp to plan"
                  : "Plan this expedition"}
              {active.available ? <ArrowRight size={17} /> : <LockKeyhole size={17} />}
            </Button>
          )}
        </div>
      </article>
      <p className="discovery-promise">
        These trails never expire. Explore at your own pace; your discoveries stay with you.
      </p>
    </section>
  );
}
