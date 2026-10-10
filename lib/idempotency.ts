// Idempotency (spec 7.2, H3). A key is bound to
// principal + endpoint + canonical request hash:
//   same key, same request      -> the original response is replayed
//   same key, different request -> IdempotencyKeyReuseError (HTTP 422)
import { createHash } from "node:crypto";
import { transaction, type Db } from "./db.ts";

export interface StoredResponse {
  status: number;
  body: string;
}

export type BeginResult =
  | { kind: "started" }
  | { kind: "replay"; response: StoredResponse }
  /** The same request is still being processed by another call. */
  | { kind: "in_progress" };

export class IdempotencyKeyReuseError extends Error {
  constructor() {
    super("idempotency_key_reuse");
  }
}

/**
 * Hash of the parts of a request that define "the same request". Fields are
 * length-prefixed so no two different field lists can collide by concatenation.
 */
export function canonicalRequestHash(principal: string, endpoint: string, fields: (string | Uint8Array)[]): string {
  const h = createHash("sha256");
  for (const f of [principal, endpoint, ...fields]) {
    const bytes = typeof f === "string" ? Buffer.from(f, "utf8") : f;
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    h.update(length).update(bytes);
  }
  return h.digest("hex");
}

interface Row {
  request_hash: string;
  status: number | null;
  body: string | null;
  created_at: number;
}

export class IdempotencyStore {
  constructor(
    private readonly db: Db,
    /** How long a completed response is replayable, in seconds. */
    private readonly ttl = 86_400,
    /** After this long an unfinished record is treated as a crashed request and may be retried. */
    private readonly inProgressTimeout = 300,
  ) {}

  /**
   * Atomically looks the key up and, if it is new, claims it.
   * @throws IdempotencyKeyReuseError if the key was used for a different request.
   */
  begin(principal: string, endpoint: string, key: string, requestHash: string, now: number): BeginResult {
    return transaction(this.db, () => {
      const row = this.db
        .prepare("SELECT request_hash, status, body, created_at FROM idempotency WHERE principal = ? AND endpoint = ? AND key = ?")
        .get(principal, endpoint, key) as Row | undefined;

      if (row !== undefined) {
        const finished = row.status !== null && row.body !== null;
        const stale = now - row.created_at > (finished ? this.ttl : this.inProgressTimeout);
        if (!stale) {
          if (row.request_hash !== requestHash) throw new IdempotencyKeyReuseError();
          if (row.status !== null && row.body !== null) {
            return { kind: "replay", response: { status: row.status, body: row.body } };
          }
          return { kind: "in_progress" };
        }
        this.db.prepare("DELETE FROM idempotency WHERE principal = ? AND endpoint = ? AND key = ?").run(principal, endpoint, key);
      }
      this.db
        .prepare("INSERT INTO idempotency (principal, endpoint, key, request_hash, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(principal, endpoint, key, requestHash, now);
      return { kind: "started" };
    });
  }

  /** Stores the response for a key claimed with {@link begin}. */
  complete(principal: string, endpoint: string, key: string, response: StoredResponse): void {
    this.db
      .prepare("UPDATE idempotency SET status = ?, body = ? WHERE principal = ? AND endpoint = ? AND key = ? AND status IS NULL")
      .run(response.status, response.body, principal, endpoint, key);
  }

  /** Drops an unfinished claim so a technical failure can be retried with the same key. */
  abandon(principal: string, endpoint: string, key: string): void {
    this.db
      .prepare("DELETE FROM idempotency WHERE principal = ? AND endpoint = ? AND key = ? AND status IS NULL")
      .run(principal, endpoint, key);
  }
}
