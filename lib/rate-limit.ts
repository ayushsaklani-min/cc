// Fixed-window rate limits and a monthly quota, persisted so they survive a
// restart and are shared by every process using the same database.
import { transaction, type Db } from "./db.ts";

export interface RateLimiter {
  /**
   * Counts one request against every scope (for example "subject:…" and
   * "ip:…"). Returns false, counting nothing, if any scope is over a limit.
   */
  allow(scopes: string[], now: number): boolean;
}

export interface RateLimits {
  /** Requests per scope per window. */
  perWindow: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Requests per scope per 30-day period. */
  perMonth: number;
}

const MONTH = 30 * 86_400;

export class SqliteRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Db,
    private readonly limits: RateLimits,
  ) {}

  allow(scopes: string[], now: number): boolean {
    const buckets = scopes.flatMap((scope) => [
      { scope: `w:${scope}`, start: now - (now % this.limits.windowSeconds), limit: this.limits.perWindow },
      { scope: `m:${scope}`, start: now - (now % MONTH), limit: this.limits.perMonth },
    ]);
    return transaction(this.db, () => {
      const count = this.db.prepare("SELECT count FROM rate_counters WHERE scope = ? AND window_start = ?");
      for (const b of buckets) {
        const row = count.get(b.scope, b.start) as { count: number } | undefined;
        if ((row?.count ?? 0) >= b.limit) return false;
      }
      const bump = this.db.prepare(
        `INSERT INTO rate_counters (scope, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT (scope, window_start) DO UPDATE SET count = count + 1`,
      );
      for (const b of buckets) bump.run(b.scope, b.start);
      this.db.prepare("DELETE FROM rate_counters WHERE window_start < ?").run(now - 2 * MONTH);
      return true;
    });
  }
}
