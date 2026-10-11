// POST /v1/verify and GET /v1/status/{subject}, independent of any web
// framework (spec 7.3, 8). A route file only parses the transport and calls in.
//
// Rules that hold for every path through this file:
//  - the oracle signs only after session, ownership, policy and registry checks;
//  - a signature is persisted (ISSUED) before it is returned;
//  - nothing from the document, the model or an exception reaches the client
//    or the logs: clients get a reason code and a correlation id.
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { JubjubPoint } from "@midnight-ntwrk/compact-runtime";
import { DocumentConflictError, type DocumentRegistry } from "./document-registry.ts";
import type { Extractor } from "./extraction-schema.ts";
import { canonicalRequestHash, IdempotencyKeyReuseError, type IdempotencyStore } from "./idempotency.ts";
import {
  decodeSignature,
  encodeSignature,
  issueAttestation,
  type Attestation,
  type IssuedAttestation,
  type OracleSigner,
} from "./oracle-signer.ts";
import { evaluatePolicy, type CrossCheck, type Identity, type Policy, type VerificationMethod } from "./policy-engine.ts";
import type { RateLimiter } from "./rate-limit.ts";
import { evaluateSignedAge, type SignedAgeRule } from "./signed-age-policy.ts";
import { OwnershipError, verifySubjectOwnership, type ChallengeStore, type OwnershipContext } from "./subject-ownership.ts";

export const VERIFY_ENDPOINT = "/v1/verify";

export interface Session {
  /** Stable identifier of the authenticated account. */
  principal: string;
  identity: Identity;
}

/** Transport-level request, already split into parts but not yet trusted. */
export interface VerifyRequest {
  authorization: string | undefined;
  idempotencyKey: string | undefined;
  clientIp: string;
  subjectHex: string | undefined;
  /** Owner public key, x | y, 32-byte big-endian each (128 hex characters). */
  ownerKeyHex: string | undefined;
  serverNonceHex: string | undefined;
  /** Schnorr signature over the ownership challenge (192 hex characters). */
  ownershipSignatureHex: string | undefined;
  document: Uint8Array | undefined;
}

export interface GatewayResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface GatewayConfig extends OwnershipContext {
  policy: Policy;
  /**
   * If set, this deployment decides from an issuer-signed record instead of
   * reading a document with a model: `policy`, the extractors and the session's
   * name are then not consulted.
   */
  signedAge?: SignedAgeRule;
  maxDocumentBytes: number;
  /** Attestation lifetime in seconds (spec: 900). */
  attestationTtl: number;
  /** How long a successful verification stays valid on-chain, in seconds. */
  statusTtl: number;
  /** Server-only key for the registry fingerprint, so the registry never holds a bare document hash. */
  fingerprintKey: Uint8Array;
}

export interface ChainReader {
  /** Revocation epoch for a subject, if any. */
  revokedAt(subject: Uint8Array): Promise<bigint | undefined>;
  /** Finalized, indexed verifiedUntil for a subject, if any. */
  verifiedUntil(subject: Uint8Array): Promise<bigint | undefined>;
}

export interface Logger {
  info(event: string, fields: Record<string, string | number | boolean>): void;
  error(event: string, fields: Record<string, string | number | boolean>): void;
}

export interface GatewayDeps {
  config: GatewayConfig;
  /** Resolves an Authorization header to a session, or undefined. */
  authenticate(authorization: string | undefined): Promise<Session | undefined>;
  challenges: ChallengeStore;
  idempotency: IdempotencyStore;
  rateLimiter: RateLimiter;
  registry: DocumentRegistry;
  extractor: Extractor;
  /** A different model or provider than `extractor`; required by policies with a cross-check. */
  crossCheckExtractor?: Extractor;
  signer: OracleSigner;
  chain: ChainReader;
  logger: Logger;
  /** Seconds since the Unix epoch. */
  now(): number;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly reason?: string,
  ) {
    super(code);
  }
}

const HEX = /^[0-9a-f]*$/;

function hexField(value: string | undefined, bytes: number, name: string): Uint8Array {
  if (value === undefined || value.length !== bytes * 2 || !HEX.test(value)) {
    throw new HttpError(400, "malformed_request", name);
  }
  return new Uint8Array(Buffer.from(value, "hex"));
}

const toBigInt = (b: Uint8Array) => BigInt(`0x${Buffer.from(b).toString("hex") || "0"}`);
const toHex = (b: Uint8Array) => Buffer.from(b).toString("hex");

function pointField(value: string | undefined, name: string): JubjubPoint {
  const raw = hexField(value, 64, name);
  return { x: toBigInt(raw.subarray(0, 32)), y: toBigInt(raw.subarray(32)) };
}

export const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

/** Content type from the leading bytes; the client's Content-Type is never consulted. */
export function sniffMimeType(bytes: Uint8Array): string | undefined {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  return undefined;
}

export function serializeIssued(issued: IssuedAttestation): Record<string, string | number | boolean> {
  const a = issued.attestation;
  return {
    schemaVersion: Number(a.schemaVersion),
    domain: toHex(a.domain),
    policyId: toHex(a.policyId),
    subject: toHex(a.subject),
    eligible: a.eligible,
    assuranceLevel: Number(a.assuranceLevel),
    amountMinorUnits: a.amountMinorUnits.toString(),
    currency: new TextDecoder().decode(a.currency),
    issuedAt: a.issuedAt.toString(),
    expiresAt: a.expiresAt.toString(),
    statusValidUntil: a.statusValidUntil.toString(),
    nonce: toHex(a.nonce),
    documentHash: toHex(a.documentHash),
    signatureHex: toHex(encodeSignature(issued.signature)),
  };
}

/** Inverse of {@link serializeIssued}, for the client building its witness. */
export function deserializeIssued(o: Record<string, unknown>): IssuedAttestation {
  const bytes = (k: string) => new Uint8Array(Buffer.from(String(o[k]), "hex"));
  const attestation: Attestation = {
    schemaVersion: BigInt(o.schemaVersion as number),
    domain: bytes("domain"),
    policyId: bytes("policyId"),
    subject: bytes("subject"),
    eligible: o.eligible === true,
    assuranceLevel: BigInt(o.assuranceLevel as number),
    amountMinorUnits: BigInt(String(o.amountMinorUnits)),
    currency: new TextEncoder().encode(String(o.currency)),
    issuedAt: BigInt(String(o.issuedAt)),
    expiresAt: BigInt(String(o.expiresAt)),
    statusValidUntil: BigInt(String(o.statusValidUntil)),
    nonce: bytes("nonce"),
    documentHash: bytes("documentHash"),
  };
  return { attestation, signature: decodeSignature(bytes("signatureHex")), digest: new Uint8Array() };
}

const isoDay = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString().slice(0, 10);

export async function handleVerify(deps: GatewayDeps, req: VerifyRequest): Promise<GatewayResponse> {
  const correlationId = randomUUID();
  const { config } = deps;
  let claimed: { principal: string; key: string } | undefined;
  let reservation: { fingerprint: string; subject: string } | undefined;

  const respond = (status: number, body: Record<string, unknown>): GatewayResponse => {
    deps.logger.info("verify", { correlationId, status });
    return { status, body };
  };
  /** A terminal answer for this idempotency key: stored, then returned. */
  const finalize = (status: number, body: Record<string, unknown>): GatewayResponse => {
    if (claimed) {
      deps.idempotency.complete(claimed.principal, VERIFY_ENDPOINT, claimed.key, { status, body: JSON.stringify(body) });
      claimed = undefined;
    }
    return respond(status, body);
  };

  try {
    const now = deps.now();

    const session = await deps.authenticate(req.authorization);
    if (!session) throw new HttpError(401, "unauthenticated");

    const subject = hexField(req.subjectHex, 32, "subject");
    const proof = {
      subject,
      ownerKey: pointField(req.ownerKeyHex, "ownerKey"),
      serverNonce: hexField(req.serverNonceHex, 32, "serverNonce"),
      signature: decodeSignature(hexField(req.ownershipSignatureHex, 96, "ownershipSignature")),
    };
    try {
      verifySubjectOwnership(deps.challenges, config, session.principal, proof, now);
    } catch (e) {
      if (!(e instanceof OwnershipError)) throw e;
      deps.logger.info("subject_ownership_failed", { correlationId });
      throw new HttpError(403, "subject_ownership_failed");
    }

    const key = req.idempotencyKey;
    if (key === undefined || key.length < 8 || key.length > 128) throw new HttpError(400, "malformed_request", "Idempotency-Key");
    if (req.document === undefined) throw new HttpError(400, "malformed_request", "document");
    const documentHash = new Uint8Array(createHash("sha256").update(req.document).digest());

    const requestHash = canonicalRequestHash(session.principal, VERIFY_ENDPOINT, [subject, documentHash]);
    const begun = deps.idempotency.begin(session.principal, VERIFY_ENDPOINT, key, requestHash, now);
    if (begun.kind === "replay") {
      return respond(begun.response.status, JSON.parse(begun.response.body) as Record<string, unknown>);
    }
    if (begun.kind === "in_progress") throw new HttpError(409, "request_in_progress");
    claimed = { principal: session.principal, key };

    const subjectHex = toHex(subject);
    if (!deps.rateLimiter.allow([`subject:${subjectHex}`, `ip:${req.clientIp}`], now)) {
      throw new HttpError(429, "rate_limited");
    }

    if (req.document.length === 0) throw new HttpError(400, "malformed_request", "document");
    if (req.document.length > config.maxDocumentBytes) throw new HttpError(413, "document_too_large");
    const mimeType = sniffMimeType(req.document);
    if (mimeType === undefined) throw new HttpError(415, "unsupported_document_type");

    // The oracle refuses to issue for a revoked subject (spec section 6).
    // The spec defines no way to lift a revocation, so any epoch on record blocks issuance.
    if ((await deps.chain.revokedAt(subject)) !== undefined) {
      return finalize(422, { status: "ineligible", reason: "subject_revoked", correlationId });
    }

    let verdict: { assuranceLevel: number; amountMinorUnits: bigint; currency: string; method: VerificationMethod };
    let fingerprint: string;
    if (config.signedAge) {
      const signed = await evaluateSignedAge(req.document, mimeType, config.signedAge, now);
      if (signed.status !== "eligible") {
        return finalize(422, { status: signed.status, reason: signed.reasonCode, correlationId });
      }
      // The issuer's signature is the evidence; there is no amount. "XXX" is ISO 4217 for "no currency".
      verdict = { assuranceLevel: 2, amountMinorUnits: 0n, currency: "XXX", method: session.identity.method };
      // Keyed on the person the record is about, not on the file: a fresh download
      // of the same record must not earn the same person a second subject.
      fingerprint = createHmac("sha256", config.fingerprintKey).update(signed.holderKey).digest("hex");
    } else {
      // The two readings are independent, so they run concurrently.
      const needsCrossCheck = config.policy.crossCheckToleranceBps !== undefined && deps.crossCheckExtractor !== undefined;
      const [extracted, second] = await Promise.all([
        deps.extractor.extract(req.document, mimeType),
        needsCrossCheck ? deps.crossCheckExtractor?.extract(req.document, mimeType) : undefined,
      ]);
      const crossCheck: CrossCheck | undefined =
        second !== undefined && deps.crossCheckExtractor
          ? { extractorId: deps.crossCheckExtractor.id, primaryExtractorId: deps.extractor.id, extraction: second }
          : undefined;

      const evaluated = evaluatePolicy(extracted, session.identity, config.policy, isoDay(now), crossCheck);
      if (evaluated.status !== "eligible") {
        return finalize(422, { status: evaluated.status, reason: evaluated.reasonCode, correlationId });
      }
      verdict = evaluated;
      fingerprint = createHmac("sha256", config.fingerprintKey).update(req.document).digest("hex");
    }

    let reserved;
    try {
      reserved = deps.registry.reserve(fingerprint, subjectHex, now);
    } catch (e) {
      if (!(e instanceof DocumentConflictError)) throw e;
      deps.logger.info("duplicate_document", { correlationId });
      return finalize(409, { error: "document_already_claimed", correlationId });
    }
    const verificationMethod = { method: verdict.method, assurance: verdict.assuranceLevel };

    if (reserved.kind === "already_issued") {
      // Signed before (possibly by a request that crashed before answering):
      // hand the original back while it is still usable, never sign a second usable one.
      if (reserved.record.expiresAt <= now) {
        // Expired, but still inside the grace period before a replacement is allowed.
        return finalize(422, { status: "ineligible", reason: "attestation_expired", correlationId });
      }
      return finalize(201, {
        status: "eligible",
        verificationMethod,
        attestation: JSON.parse(reserved.record.issued) as Record<string, unknown>,
      });
    }
    // A replacement keeps the existing ISSUED row, so there is no reservation to release on failure.
    const replacing = reserved.kind === "reissuable";
    if (!replacing) reservation = { fingerprint, subject: subjectHex };

    const issued = await issueAttestation(deps.signer, {
      schemaVersion: 1n,
      domain: config.domain,
      policyId: config.policyId,
      subject,
      eligible: true,
      assuranceLevel: BigInt(verdict.assuranceLevel),
      amountMinorUnits: verdict.amountMinorUnits,
      currency: new TextEncoder().encode(verdict.currency),
      issuedAt: BigInt(now),
      expiresAt: BigInt(now + config.attestationTtl),
      statusValidUntil: BigInt(now + config.statusTtl),
      nonce: new Uint8Array(randomBytes(32)),
      documentHash,
    });
    const attestation = serializeIssued(issued);
    const record = {
      nonce: toHex(issued.attestation.nonce),
      digest: toHex(issued.digest),
      issued: JSON.stringify(attestation),
      expiresAt: now + config.attestationTtl,
    };
    if (replacing) deps.registry.reissue(fingerprint, subjectHex, record, now);
    else deps.registry.markIssued(fingerprint, subjectHex, record, now);
    reservation = undefined; // spent: must not be released by the failure path

    return finalize(201, { status: "eligible", verificationMethod, attestation });
  } catch (e) {
    // Leave nothing half-claimed: the same key and the same document can be retried.
    if (claimed) deps.idempotency.abandon(claimed.principal, VERIFY_ENDPOINT, claimed.key);
    if (reservation) deps.registry.release(reservation.fingerprint, reservation.subject);

    if (e instanceof IdempotencyKeyReuseError) {
      return respond(422, { error: "idempotency_key_reuse", correlationId });
    }
    if (e instanceof HttpError) {
      return respond(e.status, { error: e.code, ...(e.reason ? { reason: e.reason } : {}), correlationId });
    }
    // Error text can carry document or model content, so only its type is logged.
    deps.logger.error("verify_failed", { correlationId, errorType: e instanceof Error ? e.constructor.name : typeof e });
    return { status: 500, body: { error: "verification_failed", correlationId } };
  }
}

/** GET /v1/status/{subject}: safe and idempotent; reflects only finalized, indexed chain state. */
export async function handleStatus(
  deps: Pick<GatewayDeps, "chain" | "now">,
  subjectHex: string,
): Promise<GatewayResponse> {
  if (subjectHex.length !== 64 || !HEX.test(subjectHex)) return { status: 400, body: { error: "malformed_request" } };
  const validUntil = await deps.chain.verifiedUntil(new Uint8Array(Buffer.from(subjectHex, "hex")));
  if (validUntil === undefined) return { status: 404, body: { error: "not_found" } };
  return { status: 200, body: { verified: validUntil > BigInt(deps.now()), validUntil: validUntil.toString() } };
}

// ---- Example relying party -------------------------------------------------
// How an application consumes a verification: it asks the visitor to prove
// control of a subject, then reads that subject's status. It never sees a
// document, a session, or a wallet address.

/** Challenges for the example relying party are recorded under this principal, so they cannot be used at /v1/verify. */
export const RELYING_PARTY_PRINCIPAL = "relying-party:example";

export interface AccessCheckRequest {
  subjectHex: string | undefined;
  ownerKeyHex: string | undefined;
  serverNonceHex: string | undefined;
  ownershipSignatureHex: string | undefined;
  clientIp: string;
}

/** POST /example/access/challenge: a nonce for the visitor to sign with the key behind the subject. */
export function handleAccessChallenge(
  deps: Pick<GatewayDeps, "challenges" | "rateLimiter" | "now">,
  subjectHex: string | undefined,
  clientIp: string,
): GatewayResponse {
  try {
    const subject = hexField(subjectHex, 32, "subject");
    const now = deps.now();
    if (!deps.rateLimiter.allow([`access-ip:${clientIp}`], now)) return { status: 429, body: { error: "rate_limited" } };
    const challenge = deps.challenges.issue(RELYING_PARTY_PRINCIPAL, subject, now);
    return { status: 201, body: { serverNonce: toHex(challenge.serverNonce), expiresAt: challenge.expiresAt } };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, body: { error: e.code, ...(e.reason ? { reason: e.reason } : {}) } };
    throw e;
  }
}

/**
 * POST /example/access/check: grants access only if the visitor controls the
 * subject and finalized, indexed chain state shows it verified and unexpired.
 */
export async function handleAccessCheck(
  deps: Pick<GatewayDeps, "config" | "challenges" | "rateLimiter" | "chain" | "now">,
  req: AccessCheckRequest,
): Promise<GatewayResponse> {
  try {
    const now = deps.now();
    if (!deps.rateLimiter.allow([`access-ip:${req.clientIp}`], now)) return { status: 429, body: { error: "rate_limited" } };
    const proof = {
      subject: hexField(req.subjectHex, 32, "subject"),
      ownerKey: pointField(req.ownerKeyHex, "ownerKey"),
      serverNonce: hexField(req.serverNonceHex, 32, "serverNonce"),
      signature: decodeSignature(hexField(req.ownershipSignatureHex, 96, "ownershipSignature")),
    };
    try {
      verifySubjectOwnership(deps.challenges, deps.config, RELYING_PARTY_PRINCIPAL, proof, now);
    } catch (e) {
      if (!(e instanceof OwnershipError)) throw e;
      return { status: 403, body: { error: "access_denied", reason: "ownership_not_proven" } };
    }
    const validUntil = await deps.chain.verifiedUntil(proof.subject);
    if (validUntil === undefined) return { status: 403, body: { error: "access_denied", reason: "not_verified" } };
    if (validUntil <= BigInt(now)) {
      return { status: 403, body: { error: "access_denied", reason: "expired", validUntil: validUntil.toString() } };
    }
    return { status: 200, body: { access: "granted", validUntil: validUntil.toString() } };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, body: { error: e.code, ...(e.reason ? { reason: e.reason } : {}) } };
    throw e;
  }
}
