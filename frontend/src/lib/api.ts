// Typed client for the /api/v1 routes. Nothing here invents a result: every
// state the UI shows comes from one of these responses.
import type { PublicConfig } from "../../../lib/public-config";

export type { PublicConfig };

export type SessionMethod = "emailOtp" | "walletSignature" | "govIdCamera";

export interface SessionInfo {
  method: SessionMethod;
  hasVerifiedName: boolean;
}

export type ConfigResult =
  | { kind: "ready"; config: PublicConfig }
  /** The server is up but has no contract or other required setting. */
  | { kind: "not_configured" }
  | { kind: "unreachable" };

export async function fetchConfig(): Promise<ConfigResult> {
  try {
    const r = await fetch("/api/v1/config", { cache: "no-store" });
    if (r.status === 200) return { kind: "ready", config: (await r.json()) as PublicConfig };
    if (r.status === 503) return { kind: "not_configured" };
    return { kind: "unreachable" };
  } catch {
    return { kind: "unreachable" };
  }
}

export async function fetchSession(token: string): Promise<SessionInfo | "invalid" | "unavailable"> {
  try {
    const r = await fetch("/api/v1/session", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (r.status === 200) return (await r.json()) as SessionInfo;
    if (r.status === 401) return "invalid";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export interface ApiError {
  status: number;
  error: string;
  reason?: string;
  correlationId?: string;
}

export async function requestChallenge(token: string, subjectHex: string): Promise<{ serverNonce: string } | ApiError> {
  const r = await fetch("/api/v1/challenge", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ subject: subjectHex }),
  });
  const body = (await r.json().catch(() => ({}))) as Record<string, string>;
  if (r.status === 201 && typeof body.serverNonce === "string") return { serverNonce: body.serverNonce };
  return { status: r.status, error: body.error ?? "unexpected_response", ...(body.correlationId ? { correlationId: body.correlationId } : {}) };
}

export interface VerifyResponse {
  status: number;
  body: {
    status?: "eligible" | "ineligible" | "review";
    reason?: string;
    error?: string;
    correlationId?: string;
    verificationMethod?: { method: SessionMethod; assurance: number };
    attestation?: Record<string, string | number | boolean>;
  };
}

/**
 * Uploads the document. Uses XMLHttpRequest so the UI can tell, from real
 * events, when the bytes have left the browser and the server is working.
 */
export function submitVerification(
  token: string,
  idempotencyKey: string,
  fields: Record<string, string>,
  file: File,
  events: { onUploadProgress(fraction: number): void; onUploaded(): void },
): Promise<VerifyResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    form.set("document", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/verify");
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("idempotency-key", idempotencyKey);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) events.onUploadProgress(e.loaded / e.total);
    };
    xhr.upload.onload = () => events.onUploaded();
    xhr.onerror = () => reject(new Error("network"));
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) as VerifyResponse["body"] });
      } catch {
        resolve({ status: xhr.status, body: { error: "unexpected_response" } });
      }
    };
    xhr.send(form);
  });
}

export type ChainStatus =
  | { kind: "confirmed"; verified: boolean; validUntil: string }
  | { kind: "not_registered" }
  | { kind: "unavailable" };

/** Finalized, indexed on-chain status for a subject. The only source of "Verified on Midnight". */
export async function fetchChainStatus(subjectHex: string): Promise<ChainStatus> {
  try {
    const r = await fetch(`/api/v1/status/${subjectHex}`, { cache: "no-store" });
    if (r.status === 200) {
      const b = (await r.json()) as { verified: boolean; validUntil: string };
      return { kind: "confirmed", verified: b.verified, validUntil: b.validUntil };
    }
    if (r.status === 404) return { kind: "not_registered" };
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
