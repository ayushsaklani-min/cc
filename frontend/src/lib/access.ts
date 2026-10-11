// The visitor's side of the example relying app: prove control of the subject
// behind this browser's key, then let the app read that subject's status.
// Nothing here uses the session token, the wallet, or any document.
"use client";

import { scoped, type PublicConfig } from "./api";
import { getUserSecretHex } from "./store";

/** The contract's hashing and curve code, loaded on demand because it carries WebAssembly. */
const loadCrypto = () => import("../../../lib/client-ownership");

export type AccessStep = "key" | "sign" | "status";

export type AccessResult =
  | { kind: "granted"; subject: string; validUntil: number }
  | { kind: "denied"; reason: "not_verified" | "expired" | "ownership_not_proven"; subject: string }
  /** This browser has never created a verification key. */
  | { kind: "no_key" }
  | { kind: "rate_limited" }
  | { kind: "error" };

const post = (path: string, body: unknown) =>
  fetch(scoped(`/api/example/access/${path}`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

export async function proveAccess(config: PublicConfig, onStep: (step: AccessStep) => void): Promise<AccessResult> {
  try {
    onStep("key");
    const secretHex = getUserSecretHex();
    if (secretHex === null) return { kind: "no_key" };
    const c = await loadCrypto();
    const ctx = {
      domain: c.unhex(config.domain),
      policyId: c.unhex(config.policyId),
      contractAddress: c.unhex(config.contractAddressBytes),
    };
    const secret = c.unhex(secretHex);
    const subject = c.hex(c.subjectOfSecret(ctx, secret));

    onStep("sign");
    const challenge = await post("challenge", { subject });
    if (challenge.status === 429) return { kind: "rate_limited" };
    if (challenge.status !== 201) return { kind: "error" };
    const { serverNonce } = (await challenge.json()) as { serverNonce: string };
    const proof = await c.proveOwnership(ctx, secret, c.unhex(serverNonce));

    onStep("status");
    const check = await post("check", c.proofFields(proof));
    const body = (await check.json().catch(() => ({}))) as { validUntil?: string; reason?: string };
    if (check.status === 200 && body.validUntil !== undefined) {
      return { kind: "granted", subject, validUntil: Number(body.validUntil) };
    }
    if (check.status === 429) return { kind: "rate_limited" };
    if (check.status === 403 && (body.reason === "not_verified" || body.reason === "expired" || body.reason === "ownership_not_proven")) {
      return { kind: "denied", reason: body.reason, subject };
    }
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
