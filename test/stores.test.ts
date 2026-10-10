import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../lib/db.ts";
import { DocumentConflictError, DocumentRegistry, RegistryStateError } from "../lib/document-registry.ts";
import { canonicalRequestHash, IdempotencyKeyReuseError, IdempotencyStore } from "../lib/idempotency.ts";
import { SqliteRateLimiter } from "../lib/rate-limit.ts";

const record = { nonce: "aa", digest: "bb", issued: '{"x":1}', expiresAt: 1900 };

describe("document registry", () => {
  const fresh = () => new DocumentRegistry(openDatabase(":memory:"), 900);

  it("walks RESERVED -> ISSUED -> CONFIRMED", () => {
    const r = fresh();
    expect(r.reserve("fp", "alice", 1000)).toEqual({ kind: "reserved" });
    expect(r.get("fp")?.state).toBe("RESERVED");
    r.markIssued("fp", "alice", record, 1001);
    expect(r.get("fp")).toMatchObject({ state: "ISSUED", ...record });
    expect(r.pendingSettlement().map((d) => d.fingerprint)).toEqual(["fp"]);
    r.confirm("fp", 1002);
    expect(r.get("fp")?.state).toBe("CONFIRMED");
    expect(r.pendingSettlement()).toEqual([]);
    r.confirm("fp", 1003); // idempotent
  });

  it("a live reservation by another subject is a conflict", () => {
    const r = fresh();
    r.reserve("fp", "alice", 1000);
    expect(() => r.reserve("fp", "bob", 1000 + 900)).toThrow(DocumentConflictError);
    expect(r.reserve("fp", "alice", 1500)).toEqual({ kind: "reserved" }); // same subject may retry
  });

  it("an abandoned reservation expires and can be taken over", () => {
    const r = fresh();
    r.reserve("fp", "alice", 1000);
    expect(r.reserve("fp", "bob", 1000 + 901)).toEqual({ kind: "reserved" });
    expect(r.get("fp")?.subject).toBe("bob");
    expect(() => r.markIssued("fp", "alice", record, 2000)).toThrow(RegistryStateError);
  });

  it("an ISSUED row never expires and is never re-earnable", () => {
    const r = fresh();
    r.reserve("fp", "alice", 1000);
    r.markIssued("fp", "alice", record, 1001);
    const muchLater = 1000 + 10 * 365 * 86_400;
    expect(() => r.reserve("fp", "bob", muchLater)).toThrow(DocumentConflictError);
    expect(r.reserve("fp", "alice", muchLater)).toEqual({ kind: "already_issued", record, state: "ISSUED" });
    expect(() => r.markIssued("fp", "alice", { ...record, nonce: "cc" }, muchLater)).toThrow(RegistryStateError);
    expect(r.get("fp")?.nonce).toBe("aa");
  });

  it("release drops only an unsigned reservation", () => {
    const r = fresh();
    r.reserve("fp", "alice", 1000);
    r.release("fp", "alice");
    expect(r.get("fp")).toBeUndefined();
    r.reserve("fp", "alice", 1000);
    r.markIssued("fp", "alice", record, 1001);
    r.release("fp", "alice");
    expect(r.get("fp")?.state).toBe("ISSUED");
  });

  it("cannot confirm or issue without the preceding state", () => {
    const r = fresh();
    expect(() => r.confirm("nope", 1)).toThrow(RegistryStateError);
    expect(() => r.markIssued("nope", "alice", record, 1)).toThrow(RegistryStateError);
    r.reserve("fp", "alice", 1);
    expect(() => r.confirm("fp", 2)).toThrow(RegistryStateError);
  });

  it("crash after signing: the ISSUED row survives reopening the database file", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-registry-"));
    const file = join(dir, "registry.db");
    try {
      const before = openDatabase(file);
      const r1 = new DocumentRegistry(before);
      r1.reserve("fp", "alice", 1000);
      r1.markIssued("fp", "alice", record, 1001);
      before.close(); // the process dies here, before any response or confirmation

      const after = openDatabase(file);
      const r2 = new DocumentRegistry(after);
      expect(r2.pendingSettlement()).toEqual([{ fingerprint: "fp", subject: "alice", state: "ISSUED", ...record }]);
      expect(r2.reserve("fp", "alice", 5000)).toMatchObject({ kind: "already_issued" });
      expect(() => r2.reserve("fp", "bob", 5000)).toThrow(DocumentConflictError);
      after.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("idempotency", () => {
  const fresh = () => new IdempotencyStore(openDatabase(":memory:"), 86_400, 300);
  const response = { status: 201, body: '{"ok":true}' };

  it("same key and same request replays the original response", () => {
    const s = fresh();
    expect(s.begin("p", "/v1/verify", "key-1", "h1", 100)).toEqual({ kind: "started" });
    s.complete("p", "/v1/verify", "key-1", response);
    expect(s.begin("p", "/v1/verify", "key-1", "h1", 200)).toEqual({ kind: "replay", response });
  });

  it("same key with a different request is rejected, before and after completion", () => {
    const s = fresh();
    s.begin("p", "/v1/verify", "key-1", "h1", 100);
    expect(() => s.begin("p", "/v1/verify", "key-1", "h2", 101)).toThrow(IdempotencyKeyReuseError);
    s.complete("p", "/v1/verify", "key-1", response);
    expect(() => s.begin("p", "/v1/verify", "key-1", "h2", 102)).toThrow(IdempotencyKeyReuseError);
  });

  it("keys are scoped to principal and endpoint", () => {
    const s = fresh();
    s.begin("p", "/v1/verify", "key-1", "h1", 100);
    expect(s.begin("q", "/v1/verify", "key-1", "h2", 100)).toEqual({ kind: "started" });
    expect(s.begin("p", "/v1/other", "key-1", "h2", 100)).toEqual({ kind: "started" });
  });

  it("an unfinished request reports in_progress, then becomes retryable after the timeout", () => {
    const s = fresh();
    s.begin("p", "/v1/verify", "key-1", "h1", 100);
    expect(s.begin("p", "/v1/verify", "key-1", "h1", 400)).toEqual({ kind: "in_progress" });
    expect(s.begin("p", "/v1/verify", "key-1", "h1", 401)).toEqual({ kind: "started" });
  });

  it("abandon frees an unfinished key but never a completed one", () => {
    const s = fresh();
    s.begin("p", "/v1/verify", "key-1", "h1", 100);
    s.abandon("p", "/v1/verify", "key-1");
    expect(s.begin("p", "/v1/verify", "key-1", "h2", 101)).toEqual({ kind: "started" });
    s.complete("p", "/v1/verify", "key-1", response);
    s.abandon("p", "/v1/verify", "key-1");
    expect(s.begin("p", "/v1/verify", "key-1", "h2", 102)).toEqual({ kind: "replay", response });
  });

  it("completed responses expire after the TTL", () => {
    const s = fresh();
    s.begin("p", "/v1/verify", "key-1", "h1", 100);
    s.complete("p", "/v1/verify", "key-1", response);
    expect(s.begin("p", "/v1/verify", "key-1", "h1", 100 + 86_400)).toMatchObject({ kind: "replay" });
    expect(s.begin("p", "/v1/verify", "key-1", "h9", 100 + 86_401)).toEqual({ kind: "started" });
  });

  it("canonical request hash separates fields unambiguously", () => {
    const h = (fields: string[]) => canonicalRequestHash("p", "/v1/verify", fields);
    expect(h(["ab", "c"])).toBe(h(["ab", "c"]));
    expect(h(["ab", "c"])).not.toBe(h(["a", "bc"]));
    expect(h(["abc"])).not.toBe(h(["abc", ""]));
    expect(canonicalRequestHash("p", "/v1/verify", ["x"])).not.toBe(canonicalRequestHash("q", "/v1/verify", ["x"]));
    expect(canonicalRequestHash("p", "/v1/verify", ["x"])).not.toBe(canonicalRequestHash("p", "/v1/other", ["x"]));
  });
});

describe("rate limiter", () => {
  const fresh = (perWindow: number, perMonth: number) =>
    new SqliteRateLimiter(openDatabase(":memory:"), { perWindow, windowSeconds: 60, perMonth });

  it("allows up to the window limit, then refuses until the next window", () => {
    const l = fresh(2, 100);
    expect(l.allow(["subject:a"], 600)).toBe(true);
    expect(l.allow(["subject:a"], 610)).toBe(true);
    expect(l.allow(["subject:a"], 620)).toBe(false);
    expect(l.allow(["subject:b"], 620)).toBe(true);
    expect(l.allow(["subject:a"], 660)).toBe(true);
  });

  it("any exhausted scope refuses the request and charges none of them", () => {
    const l = fresh(1, 100);
    expect(l.allow(["ip:1"], 600)).toBe(true);
    expect(l.allow(["subject:a", "ip:1"], 601)).toBe(false);
    expect(l.allow(["subject:a"], 602)).toBe(true); // was not charged by the refused call
  });

  it("enforces the monthly quota across windows", () => {
    const l = fresh(10, 3);
    for (const t of [0, 100, 200]) expect(l.allow(["subject:a"], t)).toBe(true);
    expect(l.allow(["subject:a"], 300)).toBe(false);
    expect(l.allow(["subject:a"], 30 * 86_400)).toBe(true);
  });
});
