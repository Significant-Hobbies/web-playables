import type { GameId } from "@games/cloud-contract";
import { type PersistenceHost, PlayablesCloud } from "./cloud/runtime";
import { connectWarChest } from "./cloud/war-chest";

const match = location.pathname.match(/^\/play\/(ember-road|idle-startup|war-chest)(?:\/|$)/);
const gameId = match?.[1] as GameId | undefined;
const cloud = new PlayablesCloud({
  gameId: gameId || null,
  maxSchemaVersion: gameId === "idle-startup" ? 3 : 2,
  storage: localStorage,
  fetch: window.fetch.bind(window),
  location,
});
window.playablesCloud = cloud;
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
