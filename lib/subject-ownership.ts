// Subject-ownership binding (spec 5.6, C2): the oracle only signs for a subject
// the caller has cryptographically proven it controls.
//
// A subject is the hash of (contract address, owner public key), and the owner
// public key is derived from the user's secret. To prove ownership the client
// signs a server-issued challenge with that secret; the gateway verifies the
// signature under the presented owner key and recomputes the subject from the
// same key. All hashing and curve work goes through the contract's own pure
// circuits.
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { JubjubPoint } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits, type OracleSignature } from "../contracts/managed/ciphercomply/contract/index.js";
import type { Db } from "./db.ts";
import { localSchnorrSigner } from "./oracle-signer.ts";

export interface OwnershipContext {
  domain: Uint8Array;
  policyId: Uint8Array;
  /** 32-byte address of the deployed contract the subject is scoped to. */
  contractAddress: Uint8Array;
}

export interface OwnershipProof {
  subject: Uint8Array;
  ownerKey: JubjubPoint;
  serverNonce: Uint8Array;
  signature: OracleSignature;
}

export interface Challenge {
  serverNonce: Uint8Array;
  expiresAt: number;
}

export class OwnershipError extends Error {}

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

export class ChallengeStore {
  constructor(
    private readonly db: Db,
    /** Challenge lifetime in seconds. */
    private readonly ttl = 300,
  ) {}

  /** Issues a fresh nonce bound to this principal and subject. */
  issue(principal: string, subject: Uint8Array, now: number): Challenge {
    if (subject.length !== 32) throw new OwnershipError("subject must be 32 bytes");
    const serverNonce = new Uint8Array(randomBytes(32));
    const expiresAt = now + this.ttl;
    this.db.prepare("DELETE FROM ownership_challenges WHERE expires_at <= ?").run(now);
    this.db
      .prepare("INSERT INTO ownership_challenges (nonce, principal, subject, expires_at) VALUES (?, ?, ?, ?)")
      .run(hex(serverNonce), principal, hex(subject), expiresAt);
    return { serverNonce, expiresAt };
  }

  /**
   * Whether this nonce was issued to this principal for this subject and is
   * still live. A challenge stays usable until it expires, so that a retried
   * request carrying the same Idempotency-Key can be replayed.
   */
  isLive(principal: string, subject: Uint8Array, serverNonce: Uint8Array, now: number): boolean {
    const row = this.db
      .prepare("SELECT principal, subject, expires_at FROM ownership_challenges WHERE nonce = ?")
      .get(hex(serverNonce)) as { principal: string; subject: string; expires_at: number } | undefined;
    return row !== undefined && row.principal === principal && row.subject === hex(subject) && row.expires_at > now;
  }
}

/** The 32-byte message the client signs. */
export function challengeDigest(ctx: OwnershipContext, serverNonce: Uint8Array, subject: Uint8Array): Uint8Array {
  return pureCircuits.ownershipChallenge(ctx.domain, ctx.policyId, serverNonce, subject);
}

export function subjectOfOwnerKey(ctx: OwnershipContext, ownerKey: JubjubPoint): Uint8Array {
  return pureCircuits.subjectFor(ctx.contractAddress, ownerKey);
}

/**
 * Verifies an ownership proof.
 * @throws OwnershipError for every failure; the message is for internal logs only.
 */
export function verifySubjectOwnership(
  store: ChallengeStore,
  ctx: OwnershipContext,
  principal: string,
  proof: OwnershipProof,
  now: number,
): void {
  if (proof.subject.length !== 32 || proof.serverNonce.length !== 32) {
    throw new OwnershipError("malformed proof");
  }
  if (!store.isLive(principal, proof.subject, proof.serverNonce, now)) {
    throw new OwnershipError("unknown or expired challenge");
  }
  let valid: boolean;
  try {
    // The runtime throws on coordinates that are not a curve point.
    const derived = subjectOfOwnerKey(ctx, proof.ownerKey);
    valid =
      pureCircuits.isUsableOracleKey(proof.ownerKey) &&
      timingSafeEqual(derived, proof.subject) &&
      pureCircuits.schnorrVerify(
        proof.ownerKey,
        challengeDigest(ctx, proof.serverNonce, proof.subject),
        proof.signature,
      );
  } catch {
    throw new OwnershipError("invalid key or signature encoding");
  }
  if (!valid) throw new OwnershipError("ownership proof does not verify");
}

// ---- Client side. Runs where the user secret lives; the secret never leaves it. ----

export function ownerKeyOf(userSecret: Uint8Array): JubjubPoint {
  return pureCircuits.ownerKeyOf(userSecret);
}

export function subjectOf(ctx: OwnershipContext, userSecret: Uint8Array): Uint8Array {
  return subjectOfOwnerKey(ctx, ownerKeyOf(userSecret));
}

export function proveSubjectOwnership(
  ctx: OwnershipContext,
  userSecret: Uint8Array,
  serverNonce: Uint8Array,
): OwnershipProof {
  const subject = subjectOf(ctx, userSecret);
  const signer = localSchnorrSigner(pureCircuits.ownerScalarOf(userSecret));
  return {
    subject,
    ownerKey: signer.publicKey,
    serverNonce,
    signature: signer.signSync(challengeDigest(ctx, serverNonce, subject)),
  };
}
