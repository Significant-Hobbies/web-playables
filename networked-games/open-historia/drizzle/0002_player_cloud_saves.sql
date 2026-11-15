CREATE TABLE IF NOT EXISTS account_game_slot (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  write_id TEXT NOT NULL,
  checksum TEXT NOT NULL,
  byte_count INTEGER NOT NULL CHECK(byte_count >= 0),
  schema_version TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, game_id, slot_id)
);
CREATE TABLE IF NOT EXISTS account_game_version (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  write_id TEXT NOT NULL,
  checksum TEXT NOT NULL,
  byte_count INTEGER NOT NULL,
  schema_version TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, game_id, slot_id, revision),
  UNIQUE(user_id, game_id, slot_id, write_id),
  FOREIGN KEY(user_id, game_id, slot_id) REFERENCES account_game_slot(user_id, game_id, slot_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account_game_chunk (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  part INTEGER NOT NULL,
  body BLOB NOT NULL,
  PRIMARY KEY(user_id, game_id, slot_id, revision, part),
  FOREIGN KEY(user_id, game_id, slot_id, revision) REFERENCES account_game_version(user_id, game_id, slot_id, revision) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS account_game_slot_recent ON account_game_slot(user_id, game_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS account_save_budget (
  user_id TEXT NOT NULL,
  minute INTEGER NOT NULL,
  writes INTEGER NOT NULL,
  PRIMARY KEY(user_id, minute)
);

-- Existing rows remain readable. A rolled-back last-write-wins worker cannot mutate
-- the legacy namespace after the canonical account snapshots become authoritative.
ALTER TABLE saved_game ADD COLUMN cloud_revision INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER saved_game_revision_insert BEFORE INSERT ON saved_game
WHEN NEW.cloud_revision <> 1
BEGIN SELECT RAISE(ABORT, 'legacy cloud writer must upgrade'); END;
CREATE TRIGGER saved_game_revision_update BEFORE UPDATE ON saved_game
WHEN NEW.cloud_revision <> OLD.cloud_revision + 1
BEGIN SELECT RAISE(ABORT, 'legacy cloud writer must upgrade'); END;
