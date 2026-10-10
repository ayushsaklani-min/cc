// Durable storage for the gateway: document registry, idempotency records,
// ownership challenges and rate-limit counters.
//
// Uses Node's built-in SQLite so that every state transition is a real
// transaction with no extra dependency. node:sqlite is still marked
// experimental by Node; the tables and the transaction boundaries are what
// matter here and carry over unchanged to another SQL database.
import { DatabaseSync } from "node:sqlite";

export type Db = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS documents (
  fingerprint   TEXT PRIMARY KEY,
  subject       TEXT NOT NULL,
  state         TEXT NOT NULL CHECK (state IN ('RESERVED', 'ISSUED', 'CONFIRMED')),
  reserved_at   INTEGER NOT NULL,
  nonce         TEXT,
  digest        TEXT,
  issued        TEXT,
  issued_at     INTEGER,
  expires_at    INTEGER,
  confirmed_at  INTEGER,
  CHECK (state = 'RESERVED' OR (nonce IS NOT NULL AND digest IS NOT NULL AND issued IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS documents_state ON documents (state);

CREATE TABLE IF NOT EXISTS idempotency (
  principal     TEXT NOT NULL,
  endpoint      TEXT NOT NULL,
  key           TEXT NOT NULL,
  request_hash  TEXT NOT NULL,
  status        INTEGER,
  body          TEXT,
  created_at    INTEGER NOT NULL,
  PRIMARY KEY (principal, endpoint, key)
);

CREATE TABLE IF NOT EXISTS ownership_challenges (
  nonce         TEXT PRIMARY KEY,
  principal     TEXT NOT NULL,
  subject       TEXT NOT NULL,
  expires_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_counters (
  scope         TEXT NOT NULL,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL,
  PRIMARY KEY (scope, window_start)
);
`;

/** @param path a file path, or ":memory:" for tests. */
export function openDatabase(path: string): Db {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

/** Runs `fn` in a write transaction; rolls back if it throws. */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
