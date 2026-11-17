import type { GameId } from "@games/cloud-contract";
import { mountAccountUi } from "./cloud/account-ui";
import { type PersistenceHost, PlayablesCloud } from "./cloud/runtime";
import { connectWarChest } from "./cloud/war-chest";

const match = location.pathname.match(/^\/play\/(ember-road|idle-startup|war-chest)(?:\/|$)/);
const gameId = match?.[1] as GameId | undefined;
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return {
      length: 0,
      key: () => null,
      getItem: () => null,
      setItem: () => {
        throw new Error("Browser storage is unavailable");
      },
      removeItem: () => {},
      clear: () => {},
    } satisfies Storage;
  }
})();
const cloud = new PlayablesCloud({
  gameId: gameId || null,
  maxSchemaVersion: gameId === "war-chest" ? 2 : gameId === "ember-road" ? 6 : 3,
  storage,
  fetch: window.fetch.bind(window),
  location,
});
window.playablesCloud = cloud;
mountAccountUi(cloud);
if (gameId && gameId !== "war-chest") window.playablesPersistenceHost = cloud;
else if (gameId === "war-chest") connectWarChest(cloud);
else if (!gameId) void cloud.refreshSession();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void cloud.checkpoint();
});
window.addEventListener("playables:checkpoint", () => {
  void cloud.checkpoint();
});
cloud.subscribe((state) =>
  window.dispatchEvent(new CustomEvent("playables:cloud-state", { detail: state })),
);
declare global {
  interface Window {
    playablesCloud: PlayablesCloud;
    playablesPersistenceHost?: PersistenceHost;
  }
}
