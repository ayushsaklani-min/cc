// The browser-side signer must produce proofs the server-side verifier accepts.
import { describe, expect, it } from "vitest";
import { generateUserSecret, hex, proofFields, proveOwnership, subjectOfSecret, unhex } from "../lib/client-ownership.ts";
import { openDatabase } from "../lib/db.ts";
import { decodeSignature } from "../lib/oracle-signer.ts";
import { ChallengeStore, OwnershipError, subjectOf, verifySubjectOwnership } from "../lib/subject-ownership.ts";
import { bytes } from "./harness.ts";

const ctx = { domain: bytes(32, 1), policyId: bytes(32, 2), contractAddress: bytes(32, 3) };

describe("client ownership proof", () => {
  it("derives the same subject as the server-side code", () => {
    const secret = generateUserSecret();
    expect(hex(subjectOfSecret(ctx, secret))).toBe(hex(subjectOf(ctx, secret)));
  });

  it("is accepted by the server verifier, via the wire encoding", async () => {
    const store = new ChallengeStore(openDatabase(":memory:"));
    const secret = generateUserSecret();
    const subject = subjectOfSecret(ctx, secret);
    const { serverNonce } = store.issue("acct", subject, 1000);

    const fields = proofFields(await proveOwnership(ctx, secret, serverNonce));
    expect(fields.ownerKey).toHaveLength(128);
    expect(fields.ownershipSignature).toHaveLength(192);

    const key = unhex(fields.ownerKey);
    const big = (b: Uint8Array) => BigInt(`0x${hex(b)}`);
    const proof = {
      subject: unhex(fields.subject),
      ownerKey: { x: big(key.subarray(0, 32)), y: big(key.subarray(32)) },
      serverNonce: unhex(fields.serverNonce),
      signature: decodeSignature(unhex(fields.ownershipSignature)),
    };
    expect(() => verifySubjectOwnership(store, ctx, "acct", proof, 1001)).not.toThrow();
    // The same proof presented for a different subject is rejected.
    expect(() => verifySubjectOwnership(store, ctx, "acct", { ...proof, subject: bytes(32, 9) }, 1001)).toThrow(OwnershipError);
  });

  it("hex helpers round-trip and reject malformed input", () => {
    expect(hex(unhex("00ff10"))).toBe("00ff10");
    expect(() => unhex("zz")).toThrow();
    expect(() => unhex("abc")).toThrow();
  });
});
