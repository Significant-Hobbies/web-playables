export const GAME_IDS = ["ember-road", "idle-startup", "war-chest", "open-historia"] as const;
export type GameId = (typeof GAME_IDS)[number];
export const MAX_SAVE_BYTES = 4 * 1024 * 1024;
export const CHUNK_BYTES = 256 * 1024;
export const MAX_SLOTS = 30;
export const HISTORY_LIMIT = 20;
export const MAX_RETAINED_BYTES = 128 * 1024 * 1024;

export interface SaveMetadata {
  title: string;
  chapter?: number;
  level?: number;
  turn?: number;
  scenario?: string;
  playerNationId?: string;
  difficulty?: string;
  provider?: string;
  model?: string;
}
export interface SaveEnvelope {
  schemaVersion: string;
  data: string;
  metadata: SaveMetadata;
}
export interface SaveHead {
  gameId: GameId;
  slotId: string;
  revision: number;
  checksum: string;
  bytes: number;
  schemaVersion: string;
  metadata: SaveMetadata;
  updatedAt: number;
  deleted: boolean;
  source: "cloud" | "legacy";
}
export interface CloudSave extends SaveHead {
  data: string;
}
export interface SaveWrite {
  expectedRevision: number;
  expectedChecksum?: string;
  writeId: string;
  envelope: SaveEnvelope;
  createOnly?: boolean;
}
export type WriteResult =
  | { ok: true; head: SaveHead; duplicate: boolean }
  | { ok: false; reason: "conflict" | "quota" | "write-id-reused"; current: SaveHead | null };

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value);
}
export function validSlotId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}
/** Historical campaign ids were user-entered names; keep their bounded Unicode ids readable. */
export function validCampaignId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    Array.from(value).every(
      (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
  );
}
export function validGameSlot(game: GameId, value: unknown): value is string {
  return game === "open-historia" ? validCampaignId(value) : validSlotId(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e12;
}
export function parseMetadata(value: unknown): SaveMetadata | null {
  if (!record(value) || typeof value.title !== "string" || value.title.length > 100) return null;
  const metadata: SaveMetadata = { title: value.title };
  for (const key of ["chapter", "level", "turn"] as const) {
    if (value[key] !== undefined) {
      if (!finite(value[key])) return null;
      metadata[key] = value[key];
    }
  }
  for (const key of ["scenario", "playerNationId", "difficulty", "provider", "model"] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string" || value[key].length > 500) return null;
      metadata[key] = value[key];
    }
  }
  return metadata;
}
export function redactConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactConfig);
  if (!record(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !/api.?key|secret|token|password/i.test(key))
      .map(([key, item]) => [key, redactConfig(item)]),
  );
}
export function normalizePayload(gameId: GameId, data: string): string | null {
  if (new TextEncoder().encode(data).length > MAX_SAVE_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (!record(value)) return null;
  if (gameId === "open-historia") {
    if (!record(value.gameState) || !record(value.gameConfig)) return null;
    value.gameConfig = redactConfig(value.gameConfig);
  } else if (gameId === "war-chest") {
    if (!record(value.campaign) || !record(value.battle) || !finite(value.version)) return null;
  } else if (!record(value.state) || !finite(value.version) || !finite(value.savedAt)) return null;
  const normalized = JSON.stringify(value);
  return new TextEncoder().encode(normalized).length <= MAX_SAVE_BYTES ? normalized : null;
}
export function parseWrite(gameId: GameId, value: unknown): SaveWrite | null {
  if (
    !record(value) ||
    !record(value.envelope) ||
    !Number.isSafeInteger(value.expectedRevision) ||
    (value.expectedRevision as number) < 0 ||
    !validSlotId(value.writeId) ||
    typeof value.envelope.schemaVersion !== "string" ||
    !/^[A-Za-z0-9._-]{1,32}$/.test(value.envelope.schemaVersion) ||
    typeof value.envelope.data !== "string"
  )
    return null;
  if (
    value.expectedChecksum !== undefined &&
    (typeof value.expectedChecksum !== "string" || !/^[a-f0-9]{64}$/.test(value.expectedChecksum))
  )
    return null;
  const data = normalizePayload(gameId, value.envelope.data);
  const metadata = parseMetadata(value.envelope.metadata);
  if (data === null || metadata === null) return null;
  return {
    expectedRevision: value.expectedRevision as number,
    writeId: value.writeId,
    expectedChecksum: value.expectedChecksum as string | undefined,
    envelope: { schemaVersion: value.envelope.schemaVersion, data, metadata },
    createOnly: value.createOnly === true,
  };
}
export async function checksum(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
