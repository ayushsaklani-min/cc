// Oracle signer for Profile A (Schnorr over the Jubjub embedded curve).
//
// This module has no HTTP surface and must only be called by the policy engine.
// Curve arithmetic and the challenge hash are never re-implemented here: they
// are the contract's own exported pure circuits, so signer and verifier cannot
// drift. The only arithmetic done in this file is scalar arithmetic mod the
// subgroup order.
import { createHash, randomBytes } from "node:crypto";
import type { JubjubPoint } from "@midnight-ntwrk/compact-runtime";
import {
  pureCircuits,
  type Attestation,
  type OracleSignature,
} from "../contracts/managed/ciphercomply/contract/index.js";

import { JUBJUB_SUBGROUP_ORDER } from "./jubjub.ts";

export type { Attestation, OracleSignature };

export { JUBJUB_SUBGROUP_ORDER };

// [DEVIATION D-3/D-4] The spec's interface carried a 32-byte key and a 64-byte
// signature. On ledger 8 the verifier needs an affine point and a
// (point, scalar) signature, so those are the types here.
export interface OracleSigner {
  readonly publicKey: JubjubPoint;
  sign(digest: Uint8Array): Promise<OracleSignature>;
}

/** A signer whose key is in process memory, so it can also sign synchronously. */
export interface LocalOracleSigner extends OracleSigner {
  signSync(digest: Uint8Array): OracleSignature;
}

export interface IssuedAttestation {
  attestation: Attestation;
  signature: OracleSignature;
  digest: Uint8Array;
}

const mod = (x: bigint, m: bigint): bigint => ((x % m) + m) % m;

const bytesToBigIntBE = (b: Uint8Array): bigint => {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
};

const bigIntToBytesBE = (x: bigint, length: number): Uint8Array => {
  const out = new Uint8Array(length);
  let v = x;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("value does not fit");
  return out;
};

/** Uniform non-zero scalar from 64 bytes of entropy (bias < 2^-256). */
export function scalarFromWideBytes(wide: Uint8Array): bigint {
  if (wide.length !== 64) throw new Error("expected 64 bytes");
  const s = mod(bytesToBigIntBE(wide), JUBJUB_SUBGROUP_ORDER);
  if (s === 0n) throw new Error("zero scalar");
  return s;
}

export function generateSecretScalar(): bigint {
  return scalarFromWideBytes(randomBytes(64));
}

export function publicKeyOf(secretScalar: bigint): JubjubPoint {
  return pureCircuits.schnorrPublicKey(secretScalar);
}

/**
 * In-process signer for development and tests. Production custody is a
 * separate implementation of {@link OracleSigner} (see SECURITY.md); the
 * secret scalar must never be reachable from a browser bundle.
 *
 * @param nonceEntropy injectable only so golden vectors are reproducible.
 */
export function localSchnorrSigner(
  secretScalar: bigint,
  nonceEntropy: () => Uint8Array = () => randomBytes(32),
): LocalOracleSigner {
  if (secretScalar <= 0n || secretScalar >= JUBJUB_SUBGROUP_ORDER) {
    throw new Error("secret scalar out of range");
  }
  const publicKey = publicKeyOf(secretScalar);
  if (!pureCircuits.isUsableOracleKey(publicKey)) throw new Error("unusable oracle key");
  const secretBytes = bigIntToBytesBE(secretScalar, 32);

  const signSync = (digest: Uint8Array): OracleSignature => {
      if (digest.length !== 32) throw new Error("digest must be 32 bytes");
      // Hedged nonce: bound to the key and message, plus fresh entropy. A
      // repeated nonce across two digests would reveal the key.
      const k = scalarFromWideBytes(
        createHash("sha512")
          .update("cc:schnorr:nonce:v1")
          .update(secretBytes)
          .update(digest)
          .update(nonceEntropy())
          .digest(),
      );
      const announcement = pureCircuits.schnorrPublicKey(k);
      const c = pureCircuits.schnorrChallenge(announcement, publicKey, digest);
      const response = mod(k + c * secretScalar, JUBJUB_SUBGROUP_ORDER);
      const signature = { announcement, response };
      // Never release a signature the circuit would reject.
      if (!pureCircuits.schnorrVerify(publicKey, digest, signature)) {
        throw new Error("self-verification failed");
      }
      return signature;
  };

  return { publicKey, signSync, sign: async (digest) => signSync(digest) };
}

export async function issueAttestation(
  signer: OracleSigner,
  a: Attestation,
): Promise<IssuedAttestation> {
  if (!a.eligible) throw new Error("positive attestations only");
  const digest = pureCircuits.attestationDigest(a); // identical to circuit
  const signature = await signer.sign(digest);
  return { attestation: a, signature, digest };
}

const SIGNATURE_BYTES = 96;

/** Wire form: announcement.x | announcement.y | response, 32-byte big-endian each. */
export function encodeSignature(sig: OracleSignature): Uint8Array {
  const out = new Uint8Array(SIGNATURE_BYTES);
  out.set(bigIntToBytesBE(sig.announcement.x, 32), 0);
  out.set(bigIntToBytesBE(sig.announcement.y, 32), 32);
  out.set(bigIntToBytesBE(sig.response, 32), 64);
  return out;
}

export function decodeSignature(bytes: Uint8Array): OracleSignature {
  if (bytes.length !== SIGNATURE_BYTES) throw new Error("signature must be 96 bytes");
  return {
    announcement: {
      x: bytesToBigIntBE(bytes.subarray(0, 32)),
      y: bytesToBigIntBE(bytes.subarray(32, 64)),
    },
    response: bytesToBigIntBE(bytes.subarray(64, 96)),
  };
}
