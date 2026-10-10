// Runs one verification from the browser. Every phase change here is caused by
// a real event: an API response or an upload event. There are no timers.
"use client";

import { requestChallenge, submitVerification, type PublicConfig } from "./api";
import { getUserSecretHex, setUserSecretHex, type Phase, type VerificationRecord } from "./store";

/** The contract's hashing and curve code, loaded on demand because it carries WebAssembly. */
const loadCrypto = () => import("../../../lib/client-ownership");

export async function currentSubject(config: PublicConfig): Promise<string> {
  const c = await loadCrypto();
  let secretHex = getUserSecretHex();
  if (secretHex === null) {
    secretHex = c.hex(c.generateUserSecret());
    setUserSecretHex(secretHex);
  }
  return c.hex(c.subjectOfSecret(contextOf(c, config), c.unhex(secretHex)));
}

function contextOf(c: Awaited<ReturnType<typeof loadCrypto>>, config: PublicConfig) {
  return {
    domain: c.unhex(config.domain),
    policyId: c.unhex(config.policyId),
    contractAddress: c.unhex(config.contractAddressBytes),
  };
}

const MAGIC: [string, number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
];

/** Mirrors the server's checks so obvious problems are caught before anything is uploaded. */
export async function validateFile(file: File, config: PublicConfig): Promise<string | null> {
  if (file.size === 0) return "This file is empty.";
  if (file.size > config.upload.maxBytes) return "document_too_large";
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const type = MAGIC.find(([, sig]) => sig.every((b, i) => head[i] === b))?.[0];
  if (type === undefined || !config.upload.mimeTypes.includes(type)) return "unsupported_document_type";
  return null;
}

export interface FlowEvents {
  onRecord(record: VerificationRecord): void;
  onUploadProgress(fraction: number): void;
}

const TERMINAL_BY_STATUS: Record<number, Phase> = { 409: "rejected", 413: "rejected", 415: "rejected" };

/**
 * @param record a new record in phase "idle", or an earlier one being retried.
 *   The record id is the Idempotency-Key, so a retry replays rather than re-issues.
 */
export async function runVerification(
  config: PublicConfig,
  token: string,
  file: File,
  record: VerificationRecord,
  events: FlowEvents,
): Promise<VerificationRecord> {
  let current = record;
  const update = (patch: Partial<VerificationRecord>) => {
    current = { ...current, ...patch };
    events.onRecord(current);
    return current;
  };
  // Clear the outcome of an earlier attempt so a stale field cannot leak into this one.
  const fail = (phase: Phase, reason: string, extra: Partial<VerificationRecord> = {}) =>
    update({ phase, reason, retryable: false, ...extra });

  try {
    const c = await loadCrypto();
    const secretHex = getUserSecretHex();
    if (secretHex === null) return fail("error", "malformed_request");
    const ctx = contextOf(c, config);
    const secret = c.unhex(secretHex);

    update({ phase: "uploading", reason: undefined, correlationId: undefined, httpStatus: undefined, retryable: undefined });

    const challenge = await requestChallenge(token, current.subject);
    if ("error" in challenge) {
      return fail("error", challenge.error, {
        httpStatus: challenge.status,
        correlationId: challenge.correlationId,
        retryable: challenge.status === 429 || challenge.status >= 500,
      });
    }
    const proof = await c.proveOwnership(ctx, secret, c.unhex(challenge.serverNonce));

    const response = await submitVerification(token, current.id, c.proofFields(proof), file, {
      onUploadProgress: events.onUploadProgress,
      // The request body has left the browser; from here the server is extracting and evaluating.
      onUploaded: () => update({ phase: "analyzing" }),
    });
    const { status, body } = response;
    const common = { httpStatus: status, correlationId: body.correlationId };

    if (status === 201 && body.status === "eligible" && body.attestation) {
      return update({
        ...common,
        phase: "attested",
        attestation: body.attestation,
        assurance: Number(body.attestation.assuranceLevel),
        method: body.verificationMethod?.method,
        attestationExpiresAt: Number(body.attestation.expiresAt),
      });
    }
    if (status === 422 && body.status === "review") return fail("review", body.reason ?? "", common);
    if (status === 422 && body.status === "ineligible") return fail("rejected", body.reason ?? "", common);

    const reason = body.error ?? body.reason ?? "unexpected_response";
    const phase = TERMINAL_BY_STATUS[status] ?? "error";
    // 5xx and rate limits are safe to retry: the Idempotency-Key makes the server
    // return an already-issued attestation instead of signing a second one.
    return fail(phase, reason, { ...common, retryable: phase === "error" && (status === 429 || status >= 500) });
  } catch {
    return fail("error", "network", { retryable: true });
  }
}

export function newRecord(config: PublicConfig, subject: string, file: File): VerificationRecord {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    fileName: file.name,
    fileSize: file.size,
    network: config.network,
    policyId: config.policy.id,
    subject,
    phase: "idle",
  };
}
