import "./style.css";

import { drawCover } from "./cover";

const COVER_ART: Record<string, string> = { "idle-startup": "/og-card.jpg" };

import { GAMES, type GameMeta } from "./games";

const COVER_HUES: Record<string, number> = {
  "idle-startup": 150,
  "coming-soon": 258,
};

function addText(parent: HTMLElement, className: string, text: string) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.append(element);
}

function createCard(game: GameMeta) {
  const card = document.createElement(game.status === "live" ? "a" : "article");
  card.className = `game-card game-card--${game.status}`;

  if (card instanceof HTMLAnchorElement) {
    card.href = `./play/${game.id}/`;
    card.setAttribute("aria-label", `Play ${game.title}`);
    card.addEventListener("click", (event) => {
      const health = (
        window as Window & {
          appHealth?: { track: (name: string) => void; flush?: () => Promise<unknown> };
        }
      ).appHealth;
      health?.track("game_opened");
      if (
        !health ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      let navigated = false;
      const navigate = () => {
        if (navigated) return;
        navigated = true;
        window.location.assign(card.href);
      };
      window.setTimeout(navigate, 800);
      Promise.resolve(health.flush?.())
        .catch(() => {})
        .finally(navigate);
    });
  }

  const art = document.createElement("div");
  art.className = "game-card__art";
  const artUrl = COVER_ART[game.id];
  if (artUrl) {
    const cover = document.createElement("img");
    cover.className = "game-card__cover";
    cover.src = artUrl;
    cover.alt = "";
    cover.fetchPriority = "high";
    cover.width = 1200;
    cover.height = 525;
    art.append(cover);
  } else {
    const cover = document.createElement("canvas");
    cover.className = "game-card__cover";
    cover.setAttribute("aria-hidden", "true");
    drawCover(cover, {
      hue: COVER_HUES[game.id] ?? 210,
      muted: game.status === "soon",
      seed: game.id.length * 31,
    });
    art.append(cover);
  }
  addText(art, "game-card__emoji", game.emoji);
  card.append(art);

  const body = document.createElement("div");
  body.className = "game-card__body";

  const title = document.createElement("h2");
  title.textContent = game.title;
  body.append(title);

  const tagline = document.createElement("p");
  tagline.textContent = game.tagline;
  body.append(tagline);

  addText(
    body,
    game.status === "live" ? "game-card__play" : "game-card__soon",
    game.status === "live" ? "Play →" : "Soon",
  );
  card.append(body);

  return card;
}

const app = document.getElementById("app");
if (!app) throw new Error("#app missing");

const backdrop = document.createElement("div");
backdrop.className = "backdrop";
backdrop.setAttribute("aria-hidden", "true");

const main = document.createElement("main");
main.className = "frame";

const header = document.createElement("header");
const status = document.createElement("p");
status.className = "status";
status.textContent = "Research complete · parked";
header.append(status);

const wordmark = document.createElement("h1");
wordmark.textContent = "idle.";
header.append(wordmark);

const intro = document.createElement("p");
intro.className = "intro";
intro.textContent =
  "A browser-game lab built to learn idle mechanics and portable HTML5 distribution. The retained result is Idle Startup: playable here, packaged for the web and YouTube Playables.";
header.append(intro);
main.append(header);

const grid = document.createElement("section");
grid.className = "game-grid";
grid.setAttribute("aria-label", "Games");
grid.append(...GAMES.map(createCard));
main.append(grid);

const proof = document.createElement("section");
proof.className = "proof";
proof.setAttribute("aria-labelledby", "proof-title");
proof.innerHTML = `
  <div>
    <p class="proof__eyebrow">What the lab produced</p>
    <h2 id="proof-title">One mechanic, two distribution targets.</h2>
  </div>
  <p class="proof__copy">The reusable gamekit owns the loop, versioned saves, offline progress, pause behavior, and platform adapters. The same game builds as a normal browser experience and as a submission-ready YouTube Playable. There is no promised next game; the project reopens only for a specific mechanic worth studying. Microsoft Clarity measures visits to this hub only; the game and YouTube bundle remain analytics-free.</p>
`;
main.append(proof);

const repositoryUrl = "https://github.com/sarthakagrawal927/web-playables";
const footer = document.createElement("studio-footer");
footer.setAttribute("product", "Web Playables");
footer.setAttribute("url", "https://idle.aliveville.com");
footer.setAttribute("catalog-id", "web-playables");
footer.setAttribute("capture", "newsletter");
footer.setAttribute("variant", "studio");
footer.setAttribute("art-mode", "scene");
footer.setAttribute("wordmark", "poster");
footer.setAttribute("data-mode", "dark");

const footerConfig = document.createElement("script");
footerConfig.type = "application/json";
footerConfig.textContent = JSON.stringify({
  summary: "A parked browser-game lab: one idle game and a reusable gamekit.",
  groups: [
    {
      title: "project",
      links: [
        { label: "GitHub repository", href: repositoryUrl },
        { label: "idle startup", href: "/play/idle-startup/" },
      ],
    },
  ],
  art: {
    src: "/footer-art/web-playables.webp",
    alt: "Web Playables: A browser-game packaging workshop centers an original miniature level and save capsule. Distinct playable-world props sit in open frames beside an offline travel case and modest packaging tools.",
  },
});
footer.append(footerConfig);
app.replaceChildren(backdrop, main, footer);

document.addEventListener("click", (event) => {
  const githubLink = event
    .composedPath()
    .find((target) => target instanceof HTMLAnchorElement && target.href === repositoryUrl);
  if (!githubLink) return;
  const health = (
    window as Window & {
      appHealth?: { track: (name: string) => void; flush?: () => Promise<unknown> };
    }
  ).appHealth;
  health?.track("source_repository_opened");
  void Promise.resolve(health?.flush?.()).catch(() => {});
});
