import type { GameState } from "./state";

const CHAPTERS = [
  {
    title: "A promise in a garage",
    line: "No launch party. No safety net. Just a promise to build something useful, and enough savings to give it a chance.",
  },
  {
    title: "The second key",
    line: "We have a room with our name on it. Now every payday is a promise to someone who chose to believe in us.",
  },
  {
    title: "The first real deadline",
    line: "The prototype works. The customers are waiting. Growing the team is easy compared with deciding what we will refuse to build.",
  },
  {
    title: "People, not headcount",
    line: "We used to hear every conversation in the room. Now we have to choose what kind of company those conversations create.",
  },
  {
    title: "The cost of the view",
    line: "Investors see a growth curve. We see the people who stayed late to make it possible. The next round needs to be worth what we give away.",
  },
  {
    title: "A company worth keeping",
    line: "From a borrowed table to a skyline. The next chapter is ours to choose: grow again, or make this a place people want to stay.",
  },
] as const;

export function companyStory(state: GameState) {
  const chapter = CHAPTERS[Math.min(state.officeIndex, CHAPTERS.length - 1)] ?? CHAPTERS[0];
  const colleague =
    state.team.find((mate) => /junior|senior|manager|product/.test(mate.r)) ?? state.team[0];
  const stance =
    state.boosts.decisionRemaining > 0
      ? state.boosts.decisionRev > 1
        ? "growth"
        : state.boosts.decisionRev < 1
          ? "discipline"
          : "steady"
      : "steady";
  const firstHire = state.officeIndex === 0 && state.team.length > 0;
  const rebuilding = state.crashes > 0 && state.officeIndex === 0;
  return {
    key: `${state.officeIndex}:${firstHire}:${rebuilding}:${stance}:${colleague?.s ?? state.founder}`,
    title: rebuilding
      ? "Another beginning"
      : stance === "growth"
        ? "A faster promise"
        : stance === "discipline"
          ? "Catching our breath"
          : firstHire
            ? "Someone said yes"
            : chapter.title,
    speaker: colleague?.n || state.founderName || "Founder",
    seed: colleague?.s ?? state.founder ?? 1,
    role: colleague ? "From your team" : "Founder’s notebook",
    line: rebuilding
      ? "The old company is gone. What we learned is not. This time we know what payroll feels like. Let’s make the first hire count."
      : stance === "growth"
        ? "We chose speed. The next customers are coming, and so are the longer days. Let’s make sure the growth is worth what it asks of us."
        : stance === "discipline"
          ? "We are buying time. Not every good quarter has to be a bigger quarter. Let’s use this one to make the team and the product stronger."
          : firstHire
            ? "I joined for what we might make, not the garage. Give me a small team and a real problem. We can earn the next room."
            : chapter.line,
  };
}
