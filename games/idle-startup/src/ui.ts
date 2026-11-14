import { formatNumber } from "@games/gamekit";
import { randomSeed, renderAvatar } from "./avatar";
import { createRevenueChart } from "./chart";
import { companyStory } from "./company-story";
import type { DecisionDef } from "./content";
import {
  DEPTS,
  GENERATORS,
  type GeneratorDef,
  generatorById,
  nextRoundName,
  PRESTIGE_UNIT,
  researchById,
  rollTrait,
  roundName,
  traitById,
  type UpgradeDef,
} from "./content";
import { pic } from "./img";
import { createOfficeScene } from "./office-scene";
import {
  availableUpgrades,
  breakdown,
  burnPerSec,
  campaignCost,
  canLaunchCampaign,
  companyAgeLabel,
  currentOffice,
  currentQuest,
  earningsToNextInvestor,
  engMult,
  financeBurnMult,
  founderNetWorth,
  gameDays,
  generatorUnitRate,
  generatorVisible,
  grossPerSec,
  gtmClickMult,
  hireCost,
  hireDiscount,
  INJECTION_PER_POINT,
  nextOffice,
  nextResearch,
  owned,
  raiseGain,
  roleFull,
  roundJump,
  runwaySeconds,
  severanceCost,
  tokensPerSec,
} from "./sim";
import type { GameState } from "./state";

export interface UIHooks {
  /** Hire one unit of a role, remembering the chosen candidate's face + name. */
  onHire(id: string, avatarSeed: number, name: string, traitId: string): void;
  onBuyUpgrade(id: string): void;
  onRaise(): void;
  onCampaign(): void;
  onResearch(): void;
  onOffice(): void;
  onLuckClaim(): void;
  onFire(teamIndex: number): void;
  onDecision(decision: DecisionDef, optionIndex: number): void;
  onRestart(): void;
  onPickFounder(seed: number, founderName: string, companyName: string): void;
}

export interface UI {
  render(state: GameState): void;
  toast(message: string): void;
  celebrate(title: string, sub: string): void;
  showCrash(sub: string): void;
  showFounderPicker(): void;
  showDecision(decision: DecisionDef): void;
  spawnLuckBubble(): void;
  removeLuckBubble(): void;
  setPaused(paused: boolean): void;
}

const money = (n: number) => `$${formatNumber(n)}`;

const FIRST_NAMES = [
  "Aditi",
  "Aiko",
  "Alma",
  "Amara",
  "Ansel",
  "Aria",
  "Arjun",
  "Asha",
  "Bao",
  "Beatrix",
  "Bilal",
  "Bo",
  "Camila",
  "Chen",
  "Chidi",
  "Clara",
  "Dara",
  "Devi",
  "Diego",
  "Dmitri",
  "Eitan",
  "Elif",
  "Emeka",
  "Esha",
  "Ezra",
  "Farah",
  "Felix",
  "Fern",
  "Gio",
  "Greta",
  "Hana",
  "Hassan",
  "Hiro",
  "Ida",
  "Igor",
  "Ines",
  "Ivy",
  "Jae",
  "Jamal",
  "Juno",
  "Kai",
  "Kavya",
  "Keziah",
  "Kofi",
  "Lars",
  "Leila",
  "Lin",
  "Lucia",
  "Luz",
  "Maceo",
  "Mai",
  "Malik",
  "Mara",
  "Mateo",
  "Maya",
  "Mina",
  "Mo",
  "Naomi",
  "Nia",
  "Nikhil",
  "Noor",
  "Oisin",
  "Olga",
  "Omar",
  "Ona",
  "Otto",
  "Paulo",
  "Pia",
  "Priya",
  "Quinn",
  "Rafa",
  "Ravi",
  "Remy",
  "Rin",
  "Rio",
  "Rosa",
  "Ruth",
  "Sam",
  "Sana",
  "Santi",
  "Sasha",
  "Selin",
  "Shreya",
  "Sofia",
  "Suki",
  "Tam",
  "Tara",
  "Tavi",
  "Teo",
  "Tessa",
  "Tomas",
  "Uma",
  "Vera",
  "Vik",
  "Wei",
  "Wren",
  "Xena",
  "Yara",
  "Yuki",
  "Yusuf",
  "Zadie",
  "Zane",
  "Zara",
  "Ziggy",
  "Zoe",
  "Anouk",
  "Bodhi",
  "Cleo",
  "Dax",
  "Effie",
  "Freya",
  "Gus",
  "Hollis",
  "Io",
  "Jules",
  "Kit",
  "Lior",
  "Marisol",
  "Nova",
  "Ozzy",
];
const SURNAME_LETTERS = "ABCDEFGHJKLMNPRSTVWZ";

function makeCandidateName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] ?? "Alex";
  const letter = SURNAME_LETTERS[Math.floor(Math.random() * SURNAME_LETTERS.length)] ?? "K";
  return `${first} ${letter}.`;
}

const CO_PREFIX = [
  "Rocket",
  "Mint",
  "Pixel",
  "Cloud",
  "Turbo",
  "Loop",
  "Stack",
  "Nova",
  "Quark",
  "Snack",
];
const CO_SUFFIX = ["ly", "ify", " Labs", "HQ", "Base", " Works", "Hub", "Forge", ".ai", "Nest"];

function suggestCompanyName(): string {
  const a = CO_PREFIX[Math.floor(Math.random() * CO_PREFIX.length)] ?? "Rocket";
  const b = CO_SUFFIX[Math.floor(Math.random() * CO_SUFFIX.length)] ?? "ly";
  return `${a}${b}`;
}

function deptHue(generatorId: string): number {
  const dept = generatorById(generatorId)?.dept;
  return DEPTS.find((d) => d.id === dept)?.hue ?? 150;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One-shot squash-and-stretch, re-triggerable. */
function boing(node: HTMLElement): void {
  node.classList.remove("boing");
  void node.offsetWidth;
  node.classList.add("boing");
}

interface GenRow {
  root: HTMLButtonElement;
  count: HTMLElement;
  cost: HTMLElement;
  meta: HTMLElement;
  faces: HTMLElement;
}

export function createUI(app: HTMLElement, hooks: UIHooks): UI {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- static structure -------------------------------------------------
  const backdrop = el("div", "backdrop");
  for (const [i, glyph] of ["🚀", "⭐", "💡", "📦", "☁️"].entries()) {
    const float = el("span", "floaty");
    float.style.setProperty("--i", String(i));
    float.append(pic(glyph, "floaty-img"));
    backdrop.append(float);
  }
  app.append(backdrop);
  let decisionPending = false;
  const frame = el("div", "frame");
  app.append(frame);

  const header = el("header", "top");
  const founderFace = el("span", "founder-face");
  const brand = el("div", "brand");
  const brandName = el("span", "brand-name", "Idle Startup");
  brand.append(founderFace, brandName);
  const ageChip = el("span", "age-chip", "Y1 · M1");
  const roundBadge = el("span", "round-badge", roundName(0));
  const investorsChip = el("span", "investors-chip hidden", "");
  header.append(brand, ageChip, roundBadge, investorsChip);

  // founder column
  const founder = el("section", "founder");

  const sceneCard = el("div", "card scene-card");
  const scene = createOfficeScene(sceneCard, () => {
    if (lastState && !decisionPending) showSquad(lastState);
  });

  const cashCard = el("div", "card cash-card");
  const cashValue = el("div", "cash-value", "$0");
  const cashNet = el("div", "cash-net", "");
  const cashRunway = el("div", "cash-runway hidden", "");
  const boostChips = el("div", "boost-chips", "");
  const chartCanvas = el("canvas", "revenue-chart");
  chartCanvas.setAttribute("aria-hidden", "true");
  const chart = createRevenueChart(chartCanvas);
  const founderLine = el("div", "founder-line", "");
  const detailsBtn = el("button", "details-btn", "additions & multipliers ▸");
  detailsBtn.type = "button";
  detailsBtn.addEventListener("click", () => {
    if (lastState) showBreakdown(lastState);
  });
  cashCard.append(
    el("div", "eyebrow", "Company balance"),
    cashValue,
    cashNet,
    cashRunway,
    founderLine,
    boostChips,
    chartCanvas,
    detailsBtn,
  );

  const questCard = el("div", "card quest-card");
  const questGoal = el("span", "quest-goal", "");
  const questReward = el("span", "quest-reward", "");
  questCard.append(pic("🎯", "quest-emoji"), questGoal, questReward);

  // actions: ad campaign (dice) + research lab
  const actionsCard = el("div", "card actions-card");
  actionsCard.append(el("div", "eyebrow", "Actions"));
  const adBtn = el("button", "action-btn ad-btn");
  const adMeta = el("span", "action-meta", "");
  adBtn.append(
    pic("📣", "action-icon"),
    el("span", "action-label", "Ad campaign"),
    pic("🎲", "action-dice"),
    adMeta,
  );
  adBtn.addEventListener("click", () => {
    if (!reducedMotion) boing(adBtn);
    hooks.onCampaign();
  });
  const labBtn = el("button", "action-btn lab-btn");
  const labMeta = el("span", "action-meta", "");
  labBtn.append(pic("🔬", "action-icon"), el("span", "action-label", "Research"), labMeta);
  labBtn.addEventListener("click", () => hooks.onResearch());
  const labBar = el("div", "lab-bar hidden");
  const labFill = el("div", "lab-fill");
  labBar.append(labFill);
  const officeBtn = el("button", "action-btn office-btn");
  const officeIcon = el("span", "action-icon office-icon");
  const officeLabel = el("span", "action-label", "The garage");
  const officeMeta = el("span", "action-meta", "");
  officeBtn.append(officeIcon, officeLabel, officeMeta);
  officeBtn.addEventListener("click", () => {
    if (!reducedMotion) boing(officeBtn);
    hooks.onOffice();
  });
  actionsCard.append(adBtn, labBtn, labBar, officeBtn);

  const fundCard = el("div", "card fund-card");
  const fundStatus = el("div", "fund-status", "");
  const fundBar = el("div", "fund-bar");
  const fundFill = el("div", "fund-fill");
  fundBar.append(fundFill);
  const fundBtn = el("button", "fund-btn", "Raise round");
  fundBtn.addEventListener("click", () => hooks.onRaise());
  fundCard.append(el("div", "eyebrow", "Funding"), fundStatus, fundBar, fundBtn);

  founder.append(sceneCard, cashCard, questCard);

  // ops column: org chart by department + upgrades
  const ops = el("section", "ops");
  const teamPanel = el("section", "panel");
  const teamTitleRow = el("div", "panel-title-row");
  teamTitleRow.append(el("h2", "panel-title", "The org"));
  const facesStrip = el("button", "faces-strip");
  facesStrip.type = "button";
  facesStrip.setAttribute("aria-label", "See your squad");
  facesStrip.addEventListener("click", () => {
    if (lastState) showSquad(lastState);
  });
  teamTitleRow.append(facesStrip);
  teamPanel.append(teamTitleRow);
  const deptTiles = new Map<string, { count: HTMLElement; value: HTMLElement }>();
  const tileBoard = el("div", "dept-tiles");
  for (const dept of DEPTS) {
    const tile = el("div", "dept-tile");
    tile.style.setProperty("--dept-h", String(dept.hue));
    const count = el("span", "tile-count", "0");
    const value = el("span", "tile-value", "—");
    tile.append(pic(dept.icon, "tile-icon"), el("span", "tile-name", dept.name), count, value);
    tileBoard.append(tile);
    deptTiles.set(dept.id, { count, value });
  }
  teamPanel.append(tileBoard);
  const deptBoxes = new Map<string, { head: HTMLElement; box: HTMLElement }>();
  for (const dept of DEPTS) {
    const head = el("div", "dept-head hidden");
    head.style.setProperty("--dept-h", String(dept.hue));
    head.append(el("span", "dept-name", dept.name), el("span", "dept-perk", dept.perk));
    const box = el("div", "gen-rows");
    teamPanel.append(head, box);
    deptBoxes.set(dept.id, { head, box });
  }

  const upgPanel = el("section", "panel");
  upgPanel.append(el("h2", "panel-title", "Upgrades"));
  const upgEmpty = el("p", "upg-empty", "Keep shipping — upgrades unlock as the team grows.");
  const upgCardsBox = el("div", "upg-cards");
  upgPanel.append(upgEmpty, upgCardsBox);

  const management = el("dialog", "management-dialog");
  management.setAttribute("aria-labelledby", "management-title");
  const managementHead = el("div", "management-head");
  const managementTitle = el("h2", "panel-title");
  managementTitle.id = "management-title";
  const closeManagement = el("button", "modal-cancel", "Back to the office");
  closeManagement.addEventListener("click", () => management.close());
  managementHead.append(managementTitle, closeManagement);
  management.append(managementHead, ops);
  app.append(management);
  const dock = el("nav", "office-dock");
  dock.setAttribute("aria-label", "Run your company");
  const panels = [
    ["Team", teamPanel],
    ["Upgrades", upgPanel],
    ["Growth", actionsCard],
    ["Funding", fundCard],
  ] as const;
  for (const [label, panel] of panels) {
    ops.append(panel);
    const button = el("button", "dock-button", label);
    button.addEventListener("click", () => {
      if (decisionPending || !crashVeil.classList.contains("hidden")) return;
      managementTitle.textContent = label;
      for (const [, item] of panels) item.hidden = item !== panel;
      management.showModal();
    });
    dock.append(button);
  }
  management.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(".gen-row, .faces-strip, .details-btn")) management.close();
    },
    { capture: true },
  );
  const journey = el("div", "office-journey");
  const journeyTitle = el("span", "eyebrow", "CHAPTER 1 · THE GARAGE");
  const journeyNext = el("span", "journey-next");
  journey.append(journeyTitle, journeyNext);
  const storyCard = el("aside", "company-story");
  storyCard.setAttribute("aria-label", "The company story");
  const storyPortrait = el("div", "company-story-portrait");
  const storySpeaker = el("span", "company-story-speaker");
  const storyTitle = el("h2", "company-story-title");
  const storyLine = el("p", "company-story-line");
  const storyGoal = el("p", "company-story-goal");
  const storyAction = el("button", "company-story-action", "Plan the next step");
  storyAction.addEventListener("click", () => {
    const questId = lastState ? (currentQuest(lastState)?.id ?? "") : "";
    const panels: Record<string, string> = {
      "campaign-1": "Growth",
      "office-1": "Growth",
      "research-1": "Growth",
      "raise-1": "Funding",
    };
    const label = panels[questId] ?? "Team";
    for (const button of dock.querySelectorAll<HTMLButtonElement>("button"))
      if (button.textContent === label) button.click();
  });
  storyCard.append(storyPortrait, storySpeaker, storyTitle, storyLine, storyGoal, storyAction);
  let storyKey = "";
  frame.append(header, founder, journey, dock);
  frame.append(storyCard);

  const vignette = el("div", "danger-vignette hidden");
  app.append(vignette);
  const fxLayer = el("div", "fx-layer");
  const toastBox = el("div", "toast");
  const celebration = el("div", "celebration hidden");
  const hireVeil = el("div", "modal-veil hidden");
  const crashVeil = el("div", "crash-veil hidden");
  const pauseVeil = el("div", "pause-veil hidden");
  pauseVeil.append(el("div", "pause-text", "Paused"));
  app.append(fxLayer, toastBox, celebration, hireVeil, crashVeil, pauseVeil);

  // ---- hire modal: choose WHO you hire -----------------------------------
  const closeHireModal = () => {
    if (decisionPending) return;
    hireVeil.classList.add("hidden");
    frame.inert = false;
    dock.querySelector<HTMLButtonElement>("button")?.focus();
  };
  const showHireModal = () => {
    management.close();
    frame.inert = true;
    hireVeil.classList.remove("hidden");
    hireVeil.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  };
  hireVeil.setAttribute("role", "dialog");
  hireVeil.setAttribute("aria-modal", "true");
  hireVeil.setAttribute("aria-label", "Company decision");
  hireVeil.addEventListener("click", (e) => {
    if (e.target === hireVeil) closeHireModal();
  });
  const openHireModal = (def: GeneratorDef, cost: number) => {
    if (decisionPending) return;
    hireVeil.textContent = "";
    const modal = el("div", "modal hire-modal");
    modal.style.setProperty("--medal-h", String(deptHue(def.id)));
    modal.append(
      el("div", "modal-title", "Who gets the offer?"),
      el("div", "modal-sub", `${def.name} · ${money(cost)} · then ${money(def.salary)}/day salary`),
    );
    const rowBox = el("div", "candidates");
    for (let i = 0; i < 3; i++) {
      const seed = randomSeed();
      const cand = el("button", "candidate");
      cand.type = "button";
      const face = el("span", "candidate-face");
      renderAvatar(face, seed);
      const name = makeCandidateName();
      const trait = rollTrait(Math.random());
      const chip = el("span", "trait-chip", `${trait.emoji} ${trait.blurb}`);
      chip.style.setProperty("--trait-tone", trait.rateBonus > 0 ? "1" : "0");
      cand.append(
        face,
        el("span", "candidate-name", name),
        chip,
        el("span", "candidate-hire", "Hire"),
      );
      cand.addEventListener("click", () => {
        closeHireModal();
        hooks.onHire(def.id, seed, name, trait.id);
      });
      rowBox.append(cand);
    }
    modal.append(rowBox);
    const cancel = el("button", "modal-cancel", "Not now");
    cancel.addEventListener("click", closeHireModal);
    modal.append(cancel);
    hireVeil.append(modal);
    showHireModal();
  };

  // ---- quarterly board decision --------------------------------------------
  const showDecision = (decision: DecisionDef) => {
    decisionPending = true;
    hireVeil.textContent = "";
    const modal = el("div", "modal decision-modal");
    modal.append(el("div", "modal-title", decision.title), el("div", "modal-sub", decision.blurb));
    if (lastState) {
      const voice = companyStory(lastState);
      const context = el("div", "decision-character");
      const face = el("div", "decision-character-face");
      renderAvatar(face, voice.seed);
      const copy = el("div", "decision-character-copy");
      const lines: Record<string, string> = {
        "growth-vs-discipline":
          "We can win the next customers. I need to know whether we are choosing speed or a team that can still think on Monday.",
        "acquirer-email": "They asked what we cost. I want to know what we could become.",
        offsite:
          "We know each other’s tickets and deadlines. I would like to know what makes us a team.",
        "press-cycle":
          "They will print the story we give them. Let’s make sure it is one we want to live inside.",
      };
      copy.append(
        el("strong", "", voice.speaker),
        el(
          "p",
          "",
          lines[decision.id] ??
            "This choice will change how the team works. What do we want to protect?",
        ),
      );
      context.append(face, copy);
      modal.append(context);
    }
    const box = el("div", "decision-options");
    decision.options.forEach((option, index) => {
      const btn = el("button", "decision-option");
      btn.type = "button";
      btn.append(
        el("span", "decision-label", option.label),
        el("span", "decision-desc", option.desc),
      );
      btn.addEventListener("click", () => {
        decisionPending = false;
        closeHireModal();
        hooks.onDecision(decision, index);
      });
      box.append(btn);
    });
    modal.append(box);
    hireVeil.append(modal);
    showHireModal();
  };

  // ---- the ledger: every addition and multiplier, itemized ----------------
  const showBreakdown = (state: GameState) => {
    if (decisionPending) return;
    hireVeil.textContent = "";
    const modal = el("div", "modal ledger-modal");
    modal.append(
      el("div", "modal-title", "How the money works"),
      el("div", "modal-sub", "Every addition and multiplier, live."),
    );
    const data = breakdown(state);
    const section = (title: string, lines: { label: string; value: string }[]) => {
      if (lines.length === 0) return;
      modal.append(el("div", "ledger-heading", title));
      for (const line of lines) {
        const row = el("div", "ledger-row");
        row.append(el("span", "ledger-label", line.label), el("span", "ledger-value", line.value));
        modal.append(row);
      }
    };
    section("Revenue", data.revenue);
    section("Multipliers", data.multipliers);
    section("Payroll", data.payroll);
    const close = el("button", "modal-cancel", "Got it");
    close.addEventListener("click", closeHireModal);
    modal.append(close);
    hireVeil.append(modal);
    showHireModal();
  };

  // ---- squad view: the whole company, face by face ------------------------
  const showSquad = (state: GameState) => {
    if (decisionPending) return;
    hireVeil.textContent = "";
    const modal = el("div", "modal squad-modal");
    modal.append(
      el(
        "div",
        "modal-title",
        state.companyName ? `${state.companyName} — the squad` : "The squad",
      ),
      el(
        "div",
        "modal-sub",
        `${state.team.length + (state.founder !== null ? 1 : 0)} people building this thing`,
      ),
    );
    const grid = el("div", "squad-grid");
    if (state.founder !== null) {
      const card = el("div", "squad-card founder-card");
      const face = el("span", "squad-face");
      renderAvatar(face, state.founder);
      card.append(
        face,
        el("span", "squad-name", state.founderName || "Founder"),
        el("span", "squad-role", "CEO · you"),
      );
      grid.append(card);
    }
    state.team.forEach((mate, index) => {
      const card = el("div", "squad-card");
      const face = el("span", "squad-face");
      renderAvatar(face, mate.s);
      const role = generatorById(mate.r);
      const trait = traitById(mate.t);
      card.append(
        face,
        el("span", "squad-name", mate.n || "Early crew"),
        el("span", "squad-role", role ? `${role.emoji} ${role.name}` : "Day-one believer"),
      );
      if (trait && trait.id !== "steady") {
        card.append(el("span", "squad-trait", `${trait.emoji} ${trait.name}`));
      }
      const fire = el("button", "fire-btn", `Fire · $${formatNumber(severanceCost(state, index))}`);
      fire.type = "button";
      fire.addEventListener("click", () => {
        closeHireModal();
        hooks.onFire(index);
      });
      card.append(fire);
      grid.prepend(card);
    });
    if (state.founder !== null) {
      // founder card stays first
      const first = grid.querySelector(".founder-card");
      if (first) grid.prepend(first);
    }
    modal.append(grid);
    const close = el("button", "modal-cancel", "Back to work");
    close.addEventListener("click", closeHireModal);
    modal.append(close);
    hireVeil.append(modal);
    showHireModal();
  };

  // ---- founder picker ------------------------------------------------------
  const showFounderPicker = () => {
    hireVeil.textContent = "";
    const modal = el("div", "modal founder-modal");
    modal.append(
      el("div", "modal-title", "Who's the founder?"),
      el("div", "modal-sub", "Pick your character. Rule #1: don't run out of money."),
    );
    const grid = el("div", "candidates founder-grid");
    let chosenSeed: number | null = null;
    const nameField = el("input", "name-input");
    nameField.type = "text";
    nameField.maxLength = 18;
    nameField.placeholder = "Founder name";
    const fill = () => {
      grid.textContent = "";
      chosenSeed = null;
      startBtn.disabled = true;
      for (let i = 0; i < 6; i++) {
        const seed = randomSeed();
        const cand = el("button", "candidate");
        cand.type = "button";
        const face = el("span", "candidate-face");
        renderAvatar(face, seed);
        const name = makeCandidateName();
        cand.append(face, el("span", "candidate-name", name));
        cand.addEventListener("click", () => {
          chosenSeed = seed;
          if (!nameField.value.trim() || nameField.dataset.auto !== "0") {
            nameField.value = name;
            nameField.dataset.auto = "1";
          }
          for (const other of grid.children) other.classList.remove("selected");
          cand.classList.add("selected");
          startBtn.disabled = false;
        });
        grid.append(cand);
      }
    };
    nameField.addEventListener("input", () => {
      nameField.dataset.auto = "0";
    });

    const coRow = el("div", "name-row");
    const coField = el("input", "name-input");
    coField.type = "text";
    coField.maxLength = 22;
    coField.placeholder = "Company name";
    coField.value = suggestCompanyName();
    const coShuffle = el("button", "shuffle-btn", "🎲");
    coShuffle.type = "button";
    coShuffle.setAttribute("aria-label", "Suggest another company name");
    coShuffle.addEventListener("click", () => {
      coField.value = suggestCompanyName();
    });
    coRow.append(coField, coShuffle);

    const startBtn = el("button", "start-btn", "Start building 🚀");
    startBtn.disabled = true;
    startBtn.addEventListener("click", () => {
      if (chosenSeed === null) return;
      closeHireModal();
      hooks.onPickFounder(
        chosenSeed,
        nameField.value.trim() || "Founder",
        coField.value.trim() || "My Startup",
      );
    });

    const reroll = el("button", "modal-cancel", "🎲 Show me different people");
    reroll.addEventListener("click", fill);

    fill();
    modal.append(
      grid,
      reroll,
      el("div", "name-label", "Founder"),
      nameField,
      el("div", "name-label", "Company"),
      coRow,
      startBtn,
    );
    hireVeil.append(modal);
    showHireModal();
  };

  // ---- generator rows -----------------------------------------------------
  const genRows = new Map<string, GenRow>();
  for (const def of GENERATORS) {
    const root = el("button", "gen-row hidden");
    root.type = "button";
    root.style.setProperty("--medal-h", String(deptHue(def.id)));
    const emoji = el("span", "gen-medal");
    emoji.setAttribute("aria-hidden", "true");
    emoji.append(pic(def.emoji, "medal-img"));
    const body = el("div", "gen-body");
    const nameLine = el("div", "gen-name", def.name);
    const count = el("span", "gen-count", "");
    nameLine.append(count);
    const rowFaces = el("span", "row-faces");
    nameLine.append(rowFaces);
    body.append(nameLine, el("div", "gen-flavor", def.flavor));
    const buy = el("div", "gen-buy");
    const cost = el("span", "gen-cost", "");
    const meta = el("span", "gen-rate", "");
    buy.append(cost, meta);
    root.append(emoji, body, buy);
    root.addEventListener("click", () => {
      if (lastState && roleFull(lastState, def)) return;
      if (!reducedMotion) boing(root);
      openHireModal(def, lastHireCosts.get(def.id) ?? def.baseCost);
    });
    deptBoxes.get(def.dept)?.box.append(root);
    genRows.set(def.id, { root, count, cost, meta, faces: rowFaces });
  }
  const lastHireCosts = new Map<string, number>();

  // ---- upgrade cards ------------------------------------------------------
  const upgCards = new Map<string, { root: HTMLButtonElement; def: UpgradeDef }>();
  let upgKey = "";
  const rebuildUpgrades = (defs: UpgradeDef[]) => {
    upgCardsBox.textContent = "";
    upgCards.clear();
    for (const def of defs) {
      const card = el("button", "upg-card");
      card.type = "button";
      const chip = el("span", "upg-chip");
      if (def.target === "click") {
        chip.textContent = "per ship";
        chip.style.setProperty("--chip-h", "150");
      } else if (def.target === "all") {
        chip.textContent = "everything";
        chip.style.setProperty("--chip-h", "258");
      } else {
        chip.textContent = generatorById(def.target)?.name.toLowerCase() ?? def.target;
        chip.style.setProperty("--chip-h", String(deptHue(def.target)));
      }
      const nameRow = el("div", "upg-name");
      nameRow.append(pic(def.emoji, "upg-icon"), document.createTextNode(def.name));
      card.append(
        nameRow,
        el("div", "upg-flavor", def.flavor),
        chip,
        el("div", "upg-cost", money(def.cost)),
      );
      card.addEventListener("click", () => hooks.onBuyUpgrade(def.id));
      upgCardsBox.append(card);
      upgCards.set(def.id, { root: card, def });
    }
    upgEmpty.classList.toggle("hidden", defs.length > 0);
  };

  // ---- fx -------------------------------------------------------------------
  const CONFETTI_COLORS = ["#3ee089", "#a08bff", "#ffc45e", "#e9ecfa", "#5ea8ff", "#ff7ab8"];
  const rainConfetti = (host: HTMLElement, count: number) => {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const c = el("span", "confetto");
      c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#fff";
      c.style.left = `${Math.random() * 100}%`;
      host.append(c);
      c.animate(
        [
          { transform: "translateY(-10vh) rotate(0deg)", opacity: 1 },
          {
            transform: `translateY(110vh) rotate(${540 + Math.random() * 360}deg)`,
            opacity: 0.7,
          },
        ],
        {
          duration: 1800 + Math.random() * 1400,
          delay: Math.random() * 250,
          easing: "cubic-bezier(0.3, 0, 0.8, 1)",
        },
      );
    }
  };

  let celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  const celebrate = (title: string, sub: string) => {
    management.close();
    celebration.textContent = "";
    celebration.append(el("div", "celebration-title", title), el("div", "celebration-sub", sub));
    celebration.classList.remove("hidden");
    rainConfetti(celebration, 44);
    if (!reducedMotion) {
      for (let i = 0; i < 7; i++) {
        const b = pic("🎈", "balloon");
        b.style.left = `${8 + Math.random() * 84}%`;
        celebration.append(b);
        b.animate(
          [
            { transform: "translateY(110vh) rotate(-6deg)", opacity: 1 },
            {
              transform: `translateY(-20vh) rotate(${(Math.random() - 0.5) * 24}deg)`,
              opacity: 0.9,
            },
          ],
          { duration: 2400 + Math.random() * 1200, delay: Math.random() * 350, easing: "ease-in" },
        );
      }
    }
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(() => celebration.classList.add("hidden"), 3000);
  };

  const showCrash = (sub: string) => {
    management.close();
    decisionPending = false;
    closeHireModal();
    frame.inert = true;
    crashVeil.textContent = "";
    const box = el("div", "crash-box");
    const restart = el("button", "crash-btn", "Start over 🌱");
    restart.addEventListener("click", () => {
      crashVeil.classList.add("hidden");
      frame.inert = false;
      hooks.onRestart();
    });
    box.append(
      el("div", "crash-emoji", "💥"),
      el("div", "crash-title", "Out of runway"),
      el("div", "crash-sub", sub),
      restart,
    );
    crashVeil.append(box);
    crashVeil.classList.remove("hidden");
    restart.focus();
  };

  // lucky bubble (one at a time)
  let luckBubble: HTMLButtonElement | null = null;
  const removeLuckBubble = () => {
    luckBubble?.remove();
    luckBubble = null;
  };
  const spawnLuckBubble = () => {
    removeLuckBubble();
    const bubble = el("button", "luck-bubble");
    bubble.type = "button";
    bubble.append(pic("💎", "luck-img"));
    bubble.setAttribute("aria-label", "Lucky event — grab it!");
    bubble.style.left = `${12 + Math.random() * 70}%`;
    bubble.style.top = `${18 + Math.random() * 55}%`;
    bubble.addEventListener("click", () => {
      removeLuckBubble();
      hooks.onLuckClaim();
    });
    app.append(bubble);
    luckBubble = bubble;
  };

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const toast = (message: string) => {
    toastBox.textContent = message;
    toastBox.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastBox.classList.remove("show"), 4500);
  };

  const setPaused = (paused: boolean) => {
    document.body.classList.toggle("paused", paused);
    scene.setPaused(paused);
    pauseVeil.classList.toggle("hidden", !paused);
    if (paused) {
      clearTimeout(celebrationTimer);
      clearTimeout(toastTimer);
      celebration.classList.add("hidden");
      toastBox.classList.remove("show");
    }
  };

  // ---- per-tick patch render ---------------------------------------------
  let displayCash = 0;
  let renderCount = 0;
  let lastFounderSeed: number | null = null;
  let lastTeamLen = -1;
  let lastState: GameState | null = null;
  const render = (state: GameState) => {
    lastState = state;
    const story = companyStory(state);
    if (story.key !== storyKey) {
      storyKey = story.key;
      renderAvatar(storyPortrait, story.seed);
      storySpeaker.textContent = `${story.speaker} · ${story.role}`;
      storyTitle.textContent = story.title;
      storyLine.textContent = story.line;
    }
    storyGoal.textContent = currentQuest(state)?.goal ?? "Choose the next chapter of the company.";
    displayCash = reducedMotion ? state.cash : displayCash + (state.cash - displayCash) * 0.35;
    if (Math.abs(displayCash - state.cash) < 0.5) displayCash = state.cash;
    cashValue.textContent = money(Math.max(0, displayCash));

    const gross = grossPerSec(state);
    const burn = burnPerSec(state);
    const net = gross - burn;
    cashNet.textContent =
      burn > 0
        ? `${net >= 0 ? "+" : "−"}${money(Math.abs(net))}/day net · ${money(burn)}/day payroll`
        : `+${money(gross)}/day revenue`;
    cashNet.classList.toggle("negative", net < 0);

    const runway = runwaySeconds(state);
    const showRunway = net < 0 && Number.isFinite(runway);
    cashRunway.classList.toggle("hidden", !showRunway);
    if (showRunway) {
      cashRunway.textContent = `⏳ Runway ${gameDays(runway)} — grow or crash`;
      cashRunway.classList.toggle("critical", runway < 60);
    }

    boostChips.textContent = "";
    if (state.boosts.adRemaining > 0) {
      boostChips.append(
        el(
          "span",
          "boost-chip ad",
          `📣 ×${state.boosts.adMult} · ${gameDays(state.boosts.adRemaining)}`,
        ),
      );
    }
    if (state.boosts.frenzyRemaining > 0) {
      boostChips.append(
        el(
          "span",
          "boost-chip frenzy",
          `⚡ ship frenzy · ${gameDays(state.boosts.frenzyRemaining)}`,
        ),
      );
    }
    if (state.founder !== null) {
      founderLine.textContent = `You own ${Math.round(state.equity * 100)}% · worth ${money(founderNetWorth(state))}`;
    }

    const tokens = tokensPerSec(state);
    if (tokens > 0) {
      boostChips.append(el("span", "boost-chip tokens", `🪙 ${formatNumber(tokens)} tokens/day`));
    }

    const quest = currentQuest(state);
    questCard.classList.toggle("hidden", quest === null);
    if (quest) {
      questGoal.textContent = quest.goal;
      questReward.textContent = `+${money(quest.reward)}`;
    }
    vignette.classList.toggle("hidden", !(showRunway && runway < 45));

    ageChip.textContent = companyAgeLabel(state);
    roundBadge.textContent = `${roundName(state.rounds)} stage`;
    investorsChip.classList.toggle("hidden", state.investors === 0);
    if (state.investors > 0) {
      investorsChip.textContent = `◆ ${formatNumber(state.investors)} investors · +${formatNumber(state.investors * 2)}%`;
    }

    if (state.founder !== null && state.founder !== lastFounderSeed) {
      lastFounderSeed = state.founder;
      renderAvatar(founderFace, state.founder);
    }
    if (state.companyName) {
      brandName.textContent = state.companyName;
      founderFace.title = state.founderName;
    }
    if (state.team.length !== lastTeamLen) {
      lastTeamLen = state.team.length;
      facesStrip.textContent = "";
      for (const mate of state.team.slice(-8)) {
        const face = el("span", "strip-face");
        face.title = mate.n;
        renderAvatar(face, mate.s);
        facesStrip.append(face);
      }
      if (state.team.length > 0) {
        facesStrip.append(el("span", "strip-more", "squad ▸"));
      }
      // refresh each role's mini-crew
      for (const [roleId, row] of genRows) {
        row.faces.textContent = "";
        const mates = state.team.filter((m) => m.r === roleId).slice(-3);
        for (const mate of mates) {
          const face = el("span", "row-face");
          face.title = mate.n;
          renderAvatar(face, mate.s);
          row.faces.append(face);
        }
      }
    }

    renderCount += 1;
    if (renderCount % 4 === 1) chart.push(gross);
    scene.update(state);

    // org chart
    for (const dept of DEPTS) {
      let anyVisible = false;
      for (const def of GENERATORS) {
        if (def.dept !== dept.id) continue;
        const row = genRows.get(def.id);
        if (!row) continue;
        const visible = generatorVisible(state, def);
        row.root.classList.toggle("hidden", !visible);
        if (!visible) continue;
        anyVisible = true;
        const count = owned(state, def.id);
        const cost = hireCost(state, def);
        lastHireCosts.set(def.id, cost);
        row.count.textContent = count > 0 ? `× ${count}` : "";
        row.cost.textContent = money(cost);
        row.root.classList.toggle("hired", count > 0);
        if (def.baseRate > 0) {
          row.meta.textContent = `${money(generatorUnitRate(state, def))}/day · ${money(def.salary)}/day pay`;
        } else if (def.id === "eng-manager") {
          row.meta.textContent = `auto-ships for you · ${money(def.salary)}/day pay`;
        } else {
          row.meta.textContent = `${dept.short} · ${money(def.salary)}/day pay`;
        }
        const full = roleFull(state, def);
        if (full) {
          row.cost.textContent = "hired ✓";
          row.meta.textContent = `${dept.short} · ${money(def.salary)}/day pay`;
        }
        const affordable = !full && state.cash >= cost;
        row.root.classList.toggle("affordable", affordable);
        row.root.classList.toggle("full", full);
        row.root.disabled = !affordable && !full;
      }
      const box = deptBoxes.get(dept.id);
      box?.head.classList.toggle("hidden", !anyVisible);

      // live tile: headcount + what this department is doing for you
      const tile = deptTiles.get(dept.id);
      if (tile) {
        let members = 0;
        for (const def of GENERATORS) if (def.dept === dept.id) members += owned(state, def.id);
        tile.count.textContent = String(members);
        let valueText = "—";
        if (members === 0 && dept.id !== "eng") {
          // no hires yet: no effect to show
        } else if (dept.id === "eng") {
          let sum = 0;
          for (const def of GENERATORS) {
            if (def.dept === "eng") sum += owned(state, def.id) * generatorUnitRate(state, def);
          }
          valueText = `$${formatNumber(sum)}/day`;
        } else if (dept.id === "product") valueText = `×${engMult(state).toFixed(2)} eng`;
        else if (dept.id === "gtm") valueText = `×${gtmClickMult(state).toFixed(2)} ship`;
        else if (dept.id === "people")
          valueText = `−${Math.round((1 - hireDiscount(state)) * 100)}% hires`;
        else if (dept.id === "finance")
          valueText = `−${Math.round((1 - financeBurnMult(state)) * 100)}% burn`;
        else if (dept.id === "legal")
          valueText = `+${Math.round((roundJump(state) - 1) * 100)}%/round`;
        tile.value.textContent = valueText;
      }
    }

    // upgrades
    const avail = availableUpgrades(state);
    const key = avail.map((u) => u.id).join(",");
    if (key !== upgKey) {
      upgKey = key;
      rebuildUpgrades(avail);
    }
    for (const { root, def } of upgCards.values()) {
      const affordable = state.cash >= def.cost;
      root.classList.toggle("affordable", affordable);
      root.disabled = !affordable;
    }

    // actions
    const adCost = campaignCost(state);
    if (state.boosts.adCooldown > 0) {
      adMeta.textContent = `ready in ${gameDays(state.boosts.adCooldown)}`;
      adBtn.disabled = true;
    } else {
      adMeta.textContent = `${money(adCost)} · roll the dice`;
      adBtn.disabled = !canLaunchCampaign(state);
    }

    const running = state.research.current ? researchById(state.research.current) : null;
    const next = nextResearch(state);
    if (running) {
      labMeta.textContent = `${running.name} — ${Math.floor((state.research.progress / running.seconds) * 100)}%`;
      labBtn.disabled = true;
      labBar.classList.remove("hidden");
      labFill.style.width = `${Math.min(100, (state.research.progress / running.seconds) * 100)}%`;
    } else if (next) {
      labMeta.textContent = `${next.name} · ${money(next.cost)} · ${gameDays(next.seconds)}`;
      labBtn.disabled = state.cash < next.cost;
      labBar.classList.add("hidden");
    } else {
      labMeta.textContent = "the lab has shipped everything";
      labBtn.disabled = true;
      labBar.classList.add("hidden");
    }

    // office
    const office = currentOffice(state);
    journeyTitle.textContent = `CHAPTER ${state.officeIndex + 1} · ${office.name.toUpperCase()}`;
    const destination = nextOffice(state);
    journeyNext.textContent = destination
      ? `Next: ${destination.name} · ${money(destination.cost)} · build your team to get there.`
      : "The skyline is yours. Grow your team and finish the research.";
    const nextHq = nextOffice(state);
    officeLabel.textContent = office.name;
    if (officeIcon.dataset.tier !== String(state.officeIndex)) {
      officeIcon.dataset.tier = String(state.officeIndex);
      officeIcon.textContent = "";
      officeIcon.append(pic(office.emoji, "action-icon-img"));
    }
    if (nextHq) {
      officeMeta.textContent = `→ ${nextHq.emoji} ${money(nextHq.cost)} · ×${nextHq.morale} morale · rent ${money(nextHq.rent)}/day`;
      officeBtn.disabled = state.cash < nextHq.cost;
    } else {
      officeMeta.textContent = "the skyline is yours";
      officeBtn.disabled = true;
    }

    // funding
    const gain = raiseGain(state);
    const nextName = nextRoundName(state.rounds);
    if (gain >= 1) {
      fundStatus.textContent = `Raise your ${nextName}: +◆ ${formatNumber(gain)} and +${money(gain * INJECTION_PER_POINT)} cash. Costs 15% of your equity — and salaries jump.`;
      fundBtn.textContent = `Raise ${nextName} 🎉`;
      fundBtn.disabled = false;
      fundFill.style.width = "100%";
    } else {
      const needed = earningsToNextInvestor(state);
      fundStatus.textContent = `Earn ${money(needed)} more to interest investors. Raising fuels growth — and burn.`;
      fundBtn.textContent = `Raise ${nextName}`;
      fundBtn.disabled = true;
      const target = (state.raisedThisRun + 1) ** 2 * PRESTIGE_UNIT;
      fundFill.style.width = `${Math.min(100, (state.totalEarned / target) * 100).toFixed(1)}%`;
    }
  };

  return {
    render,
    toast,
    celebrate,
    showCrash,
    showFounderPicker,
    showDecision,
    spawnLuckBubble,
    removeLuckBubble,
    setPaused,
  };
}
