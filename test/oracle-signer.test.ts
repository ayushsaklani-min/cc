import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pureCircuits, type Attestation } from "../contracts/managed/ciphercomply/contract/index.js";
import {
  decodeSignature,
  encodeSignature,
  generateSecretScalar,
  issueAttestation,
  JUBJUB_SUBGROUP_ORDER,
  localSchnorrSigner,
  publicKeyOf,
  scalarFromWideBytes,
} from "../lib/oracle-signer.ts";
import { bytes, text32 } from "./harness.ts";

const digestOf = (n: number) => bytes(32, n);

describe("Schnorr signer against the compiled verifier", () => {
  it("the subgroup-order constant is the order of the generator", () => {
    // (order - 1)*G + G must be the identity, and (order - 1)*G must not be.
    const g = pureCircuits.schnorrPublicKey(1n);
    const almost = pureCircuits.schnorrPublicKey(JUBJUB_SUBGROUP_ORDER - 1n);
    expect(almost).toEqual({ x: (-g.x + FIELD) % FIELD, y: g.y }); // -G on a twisted Edwards curve
    expect(almost).not.toEqual({ x: 0n, y: 1n });
  });

  it("signatures verify under the signer's key and only that key", () => {
    const a = localSchnorrSigner(generateSecretScalar());
    const b = localSchnorrSigner(generateSecretScalar());
    const sig = a.signSync(digestOf(1));
    expect(pureCircuits.schnorrVerify(a.publicKey, digestOf(1), sig)).toBe(true);
    expect(pureCircuits.schnorrVerify(b.publicKey, digestOf(1), sig)).toBe(false);
    expect(pureCircuits.schnorrVerify(a.publicKey, digestOf(2), sig)).toBe(false);
  });

  it("any change to the signature is rejected", () => {
    const s = localSchnorrSigner(generateSecretScalar());
    const sig = s.signSync(digestOf(1));
    const other = s.signSync(digestOf(2));
    const verify = (candidate: typeof sig) => pureCircuits.schnorrVerify(s.publicKey, digestOf(1), candidate);
    expect(verify({ ...sig, response: (sig.response + 1n) % JUBJUB_SUBGROUP_ORDER })).toBe(false);
    expect(verify({ ...sig, announcement: other.announcement })).toBe(false);
    expect(verify({ announcement: { x: 0n, y: 1n }, response: 0n })).toBe(false);
  });

  it("nonces are fresh: two signatures over one digest differ and both verify", () => {
    const s = localSchnorrSigner(generateSecretScalar());
    const first = s.signSync(digestOf(1));
    const second = s.signSync(digestOf(1));
    expect(first.announcement).not.toEqual(second.announcement);
    expect(pureCircuits.schnorrVerify(s.publicKey, digestOf(1), first)).toBe(true);
    expect(pureCircuits.schnorrVerify(s.publicKey, digestOf(1), second)).toBe(true);
  });

  it("the challenge always fits the curve's scalar range", () => {
    const s = localSchnorrSigner(generateSecretScalar());
    for (let i = 0; i < 64; i++) {
      const sig = s.signSync(digestOf(i));
      const c = pureCircuits.schnorrChallenge(sig.announcement, s.publicKey, digestOf(i));
      expect(c < 2n ** 248n).toBe(true);
    }
  });

  it("rejects out-of-range keys and malformed digests", () => {
    expect(() => localSchnorrSigner(0n)).toThrow();
    expect(() => localSchnorrSigner(JUBJUB_SUBGROUP_ORDER)).toThrow();
    expect(() => localSchnorrSigner(1n).signSync(bytes(31, 0))).toThrow();
    expect(() => scalarFromWideBytes(bytes(64, 0))).toThrow("zero scalar");
  });

  it("refuses to issue a negative attestation", async () => {
    const s = localSchnorrSigner(generateSecretScalar());
    await expect(issueAttestation(s, { ...sample(), eligible: false })).rejects.toThrow(
      "positive attestations only",
    );
  });

  it("signature wire encoding round-trips", () => {
    const sig = localSchnorrSigner(generateSecretScalar()).signSync(digestOf(9));
    const wire = encodeSignature(sig);
    expect(wire.length).toBe(96);
    expect(decodeSignature(wire)).toEqual(sig);
    expect(() => decodeSignature(wire.subarray(1))).toThrow();
  });
});

const FIELD = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

function sample(): Attestation {
  return {
    schemaVersion: 1n,
    domain: text32("cc:golden-domain"),
    policyId: text32("cc:policy:income-v1"),
    subject: bytes(32, 0x51),
    eligible: true,
    assuranceLevel: 2n,
    amountMinorUnits: 8_500_000n,
    currency: new TextEncoder().encode("USD"),
    issuedAt: 1_800_000_000n,
    expiresAt: 1_800_000_900n,
    statusValidUntil: 1_800_086_400n,
    nonce: bytes(32, 0x07),
    documentHash: bytes(32, 0xd0),
  };
}

// Golden vectors lock (message, public key, signature, digest) for the TS
// signer and the compiled contract. A change to the struct layout, either
// hash, the challenge construction or the nonce derivation breaks this test;
// regenerate with `npm run golden:update` only for an intended change.
describe("golden vectors (Profile A)", () => {
  const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
  const file = new URL("./golden/schnorr-v1.json", import.meta.url);
  if (process.env.UPDATE_GOLDEN === "1" || !existsSync(file)) {
    if (process.env.UPDATE_GOLDEN !== "1") throw new Error("golden vectors missing; run npm run golden:update");
    writeFileSync(file, `${JSON.stringify(generate(), null, 2)}\n`);
  }
  const golden = JSON.parse(readFileSync(file, "utf8")) as ReturnType<typeof generate>;

  function generate() {
    const secretScalar = scalarFromWideBytes(bytes(64, 0x5c));
    const nonceEntropy = bytes(32, 0x3e);
    const signer = localSchnorrSigner(secretScalar, () => nonceEntropy);
    const digest = pureCircuits.attestationDigest(sample());
    const contractAddress = bytes(32, 0xc0);
    return {
      secretScalar: secretScalar.toString(),
      nonceEntropy: hex(nonceEntropy),
      publicKey: { x: signer.publicKey.x.toString(), y: signer.publicKey.y.toString() },
      digest: hex(digest),
      signature: hex(encodeSignature(signer.signSync(digest))),
      subject: {
        contractAddress: hex(contractAddress),
        secretKey: hex(bytes(32, 0x11)),
        subject: hex(pureCircuits.subjectFor(contractAddress, pureCircuits.ownerKeyOf(bytes(32, 0x11)))),
      },
      nullifier: {
        contractAddress: hex(contractAddress),
        nonce: hex(bytes(32, 0x07)),
        nullifier: hex(pureCircuits.nullifierFor(contractAddress, bytes(32, 0x07))),
      },
      adminHash: { secretKey: hex(bytes(32, 0xad)), adminHash: hex(pureCircuits.adminHashOf(bytes(32, 0xad))) },
    };
  }
  const fromHex = (h: string) => new Uint8Array(Buffer.from(h, "hex"));

  it("attestation digest matches", () => {
    expect(hex(pureCircuits.attestationDigest(sample()))).toBe(golden.digest);
  });

  it("public key derivation matches", () => {
    const pk = publicKeyOf(BigInt(golden.secretScalar));
    expect({ x: pk.x.toString(), y: pk.y.toString() }).toEqual(golden.publicKey);
  });

  it("deterministic signature matches and verifies in the compiled circuit code", async () => {
    const signer = localSchnorrSigner(BigInt(golden.secretScalar), () => fromHex(golden.nonceEntropy));
    const issued = await issueAttestation(signer, sample());
    expect(hex(encodeSignature(issued.signature))).toBe(golden.signature);
    expect(
      pureCircuits.schnorrVerify(signer.publicKey, fromHex(golden.digest), decodeSignature(fromHex(golden.signature))),
    ).toBe(true);
  });

  it("subject, nullifier and admin-hash derivations match", () => {
    const { subject, nullifier, adminHash } = golden;
    expect(
      hex(pureCircuits.subjectFor(fromHex(subject.contractAddress), pureCircuits.ownerKeyOf(fromHex(subject.secretKey)))),
    ).toBe(subject.subject);
    expect(hex(pureCircuits.nullifierFor(fromHex(nullifier.contractAddress), fromHex(nullifier.nonce)))).toBe(
      nullifier.nullifier,
    );
    expect(hex(pureCircuits.adminHashOf(fromHex(adminHash.secretKey)))).toBe(adminHash.adminHash);
  });
});
