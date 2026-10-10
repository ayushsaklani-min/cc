// Spec section 10 matrix for Profile A, run against the compiled contract in
// the runtime simulator (see harness.ts for what that does and does not prove).
import { describe, expect, it } from "vitest";
import type { Attestation } from "../contracts/managed/ciphercomply/contract/index.js";
import { generateSecretScalar, localSchnorrSigner } from "../lib/oracle-signer.ts";
import { bytes, T0, text32, World } from "./harness.ts";

const expectUntouched = (w: World) => {
  expect(w.ledger.verifiedUntil.isEmpty()).toBe(true);
  expect(w.ledger.usedNullifiers.isEmpty()).toBe(true);
};

describe("verifyAndRegister", () => {
  it("happy path: registers the subject and consumes the nullifier", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    w.submit(attestation, signature);

    expect(w.ledger.verifiedUntil.lookup(w.subject)).toBe(attestation.statusValidUntil);
    expect(w.ledger.usedNullifiers.member(w.nullifierOf(attestation.nonce))).toBe(true);
    expect(w.ledger.usedNullifiers.size()).toBe(1n);
  });

  // Every signed field, changed after signing, must be rejected.
  const tampered: { [K in keyof Attestation]: (a: Attestation) => Attestation[K] } = {
    schemaVersion: () => 2n,
    domain: () => text32("cc:other-domain"),
    policyId: () => text32("cc:policy:other"),
    subject: () => bytes(32, 0x99),
    eligible: () => false,
    assuranceLevel: () => 3n,
    amountMinorUnits: (a) => a.amountMinorUnits + 1n,
    currency: () => new TextEncoder().encode("EUR"),
    issuedAt: (a) => a.issuedAt - 1n,
    expiresAt: (a) => a.expiresAt + 1n,
    statusValidUntil: (a) => a.statusValidUntil + 1n,
    nonce: () => bytes(32, 0xee),
    documentHash: () => bytes(32, 0xd1),
  };
  for (const field of Object.keys(tampered) as (keyof Attestation)[]) {
    it(`tampered ${field} aborts`, async () => {
      const w = new World();
      const { attestation, signature } = await w.issue();
      const forged = { ...attestation, [field]: tampered[field](attestation) };
      expect(() => w.submit(forged, signature)).toThrow();
      expectUntouched(w);
    });
  }

  it("reusing a valid signature with otherwise-acceptable modified witness fields aborts", async () => {
    // These changes pass every non-signature assertion, so only the binding of
    // the signature to the recomputed digest can reject them.
    const w = new World();
    const { attestation, signature } = await w.issue();
    const forgeries: Attestation[] = [
      { ...attestation, amountMinorUnits: 999_999_999n },
      { ...attestation, assuranceLevel: 3n },
      { ...attestation, documentHash: bytes(32, 0x01) },
      { ...attestation, statusValidUntil: attestation.statusValidUntil + 31_536_000n },
      { ...attestation, expiresAt: attestation.expiresAt + 600n },
      { ...attestation, nonce: bytes(32, 0x77) },
    ];
    for (const forged of forgeries) {
      expect(() => w.submit(forged, signature)).toThrow("Invalid oracle signature");
    }
    expectUntouched(w);
    w.submit(attestation, signature); // the untouched original still redeems
  });

  it("a signature over a different attestation does not transfer", async () => {
    const w = new World();
    const first = await w.issue();
    const second = await w.issue();
    expect(() => w.submit(second.attestation, first.signature)).toThrow("Invalid oracle signature");
  });

  it("rogue oracle: a signature under a different key aborts", async () => {
    const w = new World();
    const rogue = localSchnorrSigner(generateSecretScalar());
    const a = w.attestation();
    expect(() => w.submit(a, w.signSync(a, rogue))).toThrow("Invalid oracle signature");
    expectUntouched(w);
  });

  it("wrong subject: an attestation issued to someone else cannot be redeemed", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    expect(() => w.submit(attestation, signature, bytes(32, 0x66))).toThrow("Subject mismatch");
    expectUntouched(w);
  });

  it("assurance below the policy minimum aborts even when validly signed", async () => {
    const w = new World({ minAssurance: 3n });
    const a = w.attestation({ assuranceLevel: 2n });
    expect(() => w.submit(a, w.signSync(a))).toThrow("Assurance below policy minimum");
  });

  it("eligible=false aborts even when validly signed", async () => {
    const w = new World();
    const a = w.attestation({ eligible: false });
    expect(() => w.submit(a, w.signSync(a))).toThrow("Not eligible");
  });

  it("wrong domain, policy or schema abort even when validly signed", async () => {
    const w = new World();
    const cases: [Partial<Attestation>, string][] = [
      [{ domain: text32("cc:other-domain") }, "Wrong domain"],
      [{ policyId: text32("cc:policy:other") }, "Wrong policy"],
      [{ schemaVersion: 2n }, "Unsupported schema"],
    ];
    for (const [override, message] of cases) {
      const a = w.attestation(override);
      expect(() => w.submit(a, w.signSync(a))).toThrow(message);
    }
  });

  it("malformed validity windows abort even when validly signed", async () => {
    const w = new World();
    const now = BigInt(T0);
    const inverted = w.attestation({ issuedAt: now + 900n, expiresAt: now + 900n });
    expect(() => w.submit(inverted, w.signSync(inverted))).toThrow("Invalid window");
    const short = w.attestation({ statusValidUntil: now + 899n });
    expect(() => w.submit(short, w.signSync(short))).toThrow("Invalid status window");
  });

  it("replay: the second submission of the same attestation aborts", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    w.submit(attestation, signature);
    expect(() => w.submit(attestation, signature)).toThrow("Attestation already used");
    expect(w.ledger.usedNullifiers.size()).toBe(1n);
  });
});

describe("expiry by chain time", () => {
  it("accepts strictly before expiresAt and rejects at or after it", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    const expiresAt = Number(attestation.expiresAt);

    w.time = expiresAt;
    expect(() => w.submit(attestation, signature)).toThrow("Attestation expired");
    w.time = expiresAt + 3600;
    expect(() => w.submit(attestation, signature)).toThrow("Attestation expired");
    expectUntouched(w);

    w.time = expiresAt - 1;
    w.submit(attestation, signature);
    expect(w.ledger.verifiedUntil.member(w.subject)).toBe(true);
  });

  it("the oracle cannot be bypassed with a client-chosen later expiry", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    w.time = Number(attestation.expiresAt) + 10;
    const extended = { ...attestation, expiresAt: attestation.expiresAt + 3600n };
    expect(() => w.submit(extended, signature)).toThrow("Invalid oracle signature");
  });
});

describe("status monotonicity", () => {
  it("a later attestation cannot move verifiedUntil backward", async () => {
    const w = new World();
    const long = await w.issue({ statusValidUntil: BigInt(T0) + 200_000n });
    const short = await w.issue({ statusValidUntil: BigInt(T0) + 100_000n });
    w.submit(long.attestation, long.signature);
    expect(() => w.submit(short.attestation, short.signature)).toThrow("Status would move backward");
    expect(w.ledger.verifiedUntil.lookup(w.subject)).toBe(long.attestation.statusValidUntil);
  });

  it("a later attestation can extend verifiedUntil", async () => {
    const w = new World();
    const first = await w.issue({ statusValidUntil: BigInt(T0) + 100_000n });
    const second = await w.issue({ statusValidUntil: BigInt(T0) + 200_000n });
    w.submit(first.attestation, first.signature);
    w.submit(second.attestation, second.signature);
    expect(w.ledger.verifiedUntil.lookup(w.subject)).toBe(second.attestation.statusValidUntil);
    expect(w.ledger.usedNullifiers.size()).toBe(2n);
  });
});

describe("revokeSubject", () => {
  it("revoked-then-resurrect: a pre-revocation attestation aborts", async () => {
    const w = new World();
    const before = await w.issue(); // issuedAt = T0
    w.time = T0 + 60;
    w.revoke(w.subject, BigInt(T0 + 60));
    expect(() => w.submit(before.attestation, before.signature)).toThrow("Issued before revocation");
  });

  it("clears existing status, and a post-revocation attestation re-registers", async () => {
    const w = new World();
    const first = await w.issue();
    w.submit(first.attestation, first.signature);

    w.time = T0 + 60;
    w.revoke(w.subject, BigInt(T0 + 60));
    expect(w.ledger.verifiedUntil.member(w.subject)).toBe(false);
    expect(w.ledger.revokedAt.lookup(w.subject)).toBe(BigInt(T0 + 60));

    w.time = T0 + 120;
    const after = await w.issue(); // issuedAt = T0 + 120
    w.submit(after.attestation, after.signature);
    expect(w.ledger.verifiedUntil.member(w.subject)).toBe(true);
  });

  it("revocation epoch cannot move backward", () => {
    const w = new World();
    w.time = T0 + 100;
    w.revoke(w.subject, BigInt(T0 + 100));
    expect(() => w.revoke(w.subject, BigInt(T0 + 99))).toThrow("Revocation epoch moved backward");
    expect(w.ledger.revokedAt.lookup(w.subject)).toBe(BigInt(T0 + 100));
  });

  it("revocation cannot be dated in the future of chain time", () => {
    const w = new World();
    expect(() => w.revoke(w.subject, BigInt(T0 + 1))).toThrow("Revocation in the future");
    expect(w.ledger.revokedAt.isEmpty()).toBe(true);
    w.revoke(w.subject, BigInt(T0)); // exactly "now" is allowed
  });

  it("non-admin is rejected", () => {
    const w = new World();
    expect(() => w.revoke(w.subject, BigInt(T0), bytes(32, 0x01))).toThrow("Not admin");
    expect(w.ledger.revokedAt.isEmpty()).toBe(true);
  });
});

describe("rotateOracleKey", () => {
  it("rotation invalidates unsubmitted attestations and bumps the key id", async () => {
    const w = new World();
    const pending = await w.issue();
    const next = localSchnorrSigner(generateSecretScalar());

    w.rotate(next.publicKey);
    expect(w.ledger.oracleKeyId).toBe(2n);
    expect(w.ledger.oraclePublicKey).toEqual(next.publicKey);
    expect(() => w.submit(pending.attestation, pending.signature)).toThrow("Invalid oracle signature");

    const a = w.attestation();
    w.submit(a, w.signSync(a, next));
    expect(w.ledger.verifiedUntil.member(w.subject)).toBe(true);
  });

  it("non-admin is rejected", () => {
    const w = new World();
    const next = localSchnorrSigner(generateSecretScalar());
    expect(() => w.rotate(next.publicKey, bytes(32, 0x01))).toThrow("Not admin");
    expect(w.ledger.oracleKeyId).toBe(1n);
    expect(w.ledger.oraclePublicKey).toEqual(w.oracle.publicKey);
  });

  it("the identity and other small-order keys are rejected at rotation and deployment", () => {
    const w = new World();
    const identity = { x: 0n, y: 1n };
    expect(() => w.rotate(identity)).toThrow("Unusable oracle key");
    expect(() => new World({ oracleKey: identity })).toThrow("Unusable oracle key");
  });
});

describe("public-state leakage", () => {
  it("only subject, statusValidUntil, nullifier and revokedAt reach the ledger", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    w.submit(attestation, signature);
    w.time = T0 + 5;
    w.revoke(bytes(32, 0x42), BigInt(T0 + 5));

    const l = w.ledger;
    expect([...l.verifiedUntil]).toEqual([[w.subject, attestation.statusValidUntil]]);
    expect([...l.usedNullifiers]).toEqual([[w.nullifierOf(attestation.nonce), true]]);
    expect([...l.revokedAt]).toEqual([[bytes(32, 0x42), BigInt(T0 + 5)]]);
  });

  it("private witness values do not appear in the public transcript", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue({
      amountMinorUnits: 0x1122334455667788n,
      documentHash: bytes(32, 0xd7),
      nonce: bytes(32, 0xa5),
    });
    const r = w.submit(attestation, signature);
    const transcript = JSON.stringify(r.proofData.publicTranscript, (_k, v) =>
      typeof v === "bigint" ? v.toString(16) : v instanceof Uint8Array ? Buffer.from(v).toString("hex") : v,
    );
    const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
    for (const secret of [w.userSecret, attestation.documentHash, attestation.nonce]) {
      expect(transcript).not.toContain(hex(secret));
    }
    expect(transcript).not.toContain("1122334455667788");
    // Positive controls: values that are meant to be public are found by the same search.
    expect(transcript).toContain(hex(w.subject));
    expect(transcript).toContain(hex(w.nullifierOf(attestation.nonce)));
  });
});
