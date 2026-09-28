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
    card.addEventListener("click", () => {
      const health = (window as Window & { appHealth?: { track: (name: string) => void } })
        .appHealth;
      health?.track("game_opened");
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

const footer = document.createElement("footer");
footer.className = "site-footer";
const githubLink = document.createElement("a");
githubLink.href = "https://github.com/sarthakagrawal927/web-playables";
githubLink.target = "_blank";
githubLink.rel = "noopener noreferrer";
githubLink.setAttribute("aria-label", "GitHub repository");
githubLink.title = "GitHub repository";
githubLink.innerHTML =
  '<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>';
footer.append(githubLink);
main.append(footer);

app.replaceChildren(backdrop, main);
