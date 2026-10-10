// Browser-side half of the subject-ownership proof (spec 5.6). Runs where the
// user secret lives and uses only Web APIs, so it can be bundled for a browser:
// no Node built-ins. Hashing and curve work are the contract's pure circuits.
import type { JubjubPoint } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits, type OracleSignature } from "../contracts/managed/ciphercomply/contract/index.js";
import { JUBJUB_SUBGROUP_ORDER } from "./jubjub.ts";

export interface ClientContext {
  domain: Uint8Array;
  policyId: Uint8Array;
  contractAddress: Uint8Array;
}

export interface ClientOwnershipProof {
  subject: Uint8Array;
  ownerKey: JubjubPoint;
  serverNonce: Uint8Array;
  signature: OracleSignature;
}

const bytesToBigInt = (b: Uint8Array): bigint => {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
};

export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function unhex(h: string): Uint8Array {
  if (!/^([0-9a-f]{2})*$/.test(h)) throw new Error("malformed hex");
  return Uint8Array.from(h.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

const be32 = (x: bigint): string => x.toString(16).padStart(64, "0");

/** A fresh 32-byte user secret whose derived scalar is usable. */
export function generateUserSecret(): Uint8Array {
  for (;;) {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    if (pureCircuits.ownerScalarOf(secret) !== 0n) return secret;
  }
}

export function subjectOfSecret(ctx: ClientContext, userSecret: Uint8Array): Uint8Array {
  return pureCircuits.subjectFor(ctx.contractAddress, pureCircuits.ownerKeyOf(userSecret));
}

/** Signs the server's challenge with the user secret. The secret is not transmitted. */
export async function proveOwnership(
  ctx: ClientContext,
  userSecret: Uint8Array,
  serverNonce: Uint8Array,
): Promise<ClientOwnershipProof> {
  const scalar = pureCircuits.ownerScalarOf(userSecret);
  const ownerKey = pureCircuits.schnorrPublicKey(scalar);
  const subject = pureCircuits.subjectFor(ctx.contractAddress, ownerKey);
  const digest = pureCircuits.ownershipChallenge(ctx.domain, ctx.policyId, serverNonce, subject);

  // Hedged nonce: key, message and fresh entropy through SHA-512, reduced mod the group order.
  const tag = new TextEncoder().encode("cc:ownership:nonce:v1");
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const input = new Uint8Array(tag.length + 32 + 32 + 32);
  input.set(tag, 0);
  input.set(userSecret, tag.length);
  input.set(digest, tag.length + 32);
  input.set(entropy, tag.length + 64);
  const wide = new Uint8Array(await crypto.subtle.digest("SHA-512", input));
  const k = bytesToBigInt(wide) % JUBJUB_SUBGROUP_ORDER;
  if (k === 0n) throw new Error("zero nonce");

  const announcement = pureCircuits.schnorrPublicKey(k);
  const c = pureCircuits.schnorrChallenge(announcement, ownerKey, digest);
  const signature = { announcement, response: (k + c * scalar) % JUBJUB_SUBGROUP_ORDER };
  if (!pureCircuits.schnorrVerify(ownerKey, digest, signature)) throw new Error("self-verification failed");
  return { subject, ownerKey, serverNonce, signature };
}

/** The hex form fields POST /v1/verify expects. */
export function proofFields(proof: ClientOwnershipProof): Record<"subject" | "ownerKey" | "serverNonce" | "ownershipSignature", string> {
  return {
    subject: hex(proof.subject),
    ownerKey: be32(proof.ownerKey.x) + be32(proof.ownerKey.y),
    serverNonce: hex(proof.serverNonce),
    ownershipSignature: be32(proof.signature.announcement.x) + be32(proof.signature.announcement.y) + be32(proof.signature.response),
  };
}
