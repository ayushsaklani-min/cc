// Browser-local state: the development session token, the user secret behind
// the subject, and this browser's verification history. None of it is sent
// anywhere except as the API calls in api.ts require.
"use client";

import { useSyncExternalStore } from "react";

export type Phase =
  | "idle"
  | "uploading"
  | "analyzing"
  | "rejected"
  | "review"
  | "attested"
  | "proving"
  | "submitting"
  | "confirmed"
  | "error";

export interface VerificationRecord {
  /** Also the Idempotency-Key, so a retry can never mint a second attestation. */
  id: string;
  createdAt: number;
  updatedAt: number;
  fileName: string;
  fileSize: number;
  network: string;
  policyId: string;
  subject: string;
  phase: Phase;
  /** Safe reason code from the API, never raw error text. */
  reason?: string;
  correlationId?: string;
  httpStatus?: number;
  /** Whether repeating the same request is safe (the server decides via the idempotency key). */
  retryable?: boolean;
  assurance?: number;
  method?: string;
  /** Seconds since the Unix epoch, from the signed attestation. */
  attestationExpiresAt?: number;
  /** The signed attestation: private witness material, kept for on-chain submission, never displayed. */
  attestation?: Record<string, string | number | boolean>;
  /** Safe code for the last failed on-chain submission attempt; the attestation is still held. */
  submitError?: string;
  /** What the wallet itself reported for that failure, shown as plain text. */
  submitDetail?: string;
  /** Set once Midnight.js reports the submitted transaction finalized. */
  txId?: string;
  txHash?: string;
  blockHeight?: number;
  /** From finalized, indexed chain state only. */
  chainValidUntil?: number;
  confirmedAt?: number;
}

const TOKEN_KEY = "cc.dev-session-token";
const SECRET_KEY = "cc.user-secret";
const HISTORY_KEY = "cc.verifications";
const CONSENT_KEY = "cc.processing-consent";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

/** A hook over one storage key. Returns null on the server and before hydration. */
function useStored(storage: () => Storage, key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => storage().getItem(key),
    () => null,
  );
}

export const useSessionToken = () => useStored(() => sessionStorage, TOKEN_KEY);
export function setSessionToken(token: string | null): void {
  if (token === null) sessionStorage.removeItem(TOKEN_KEY);
  else sessionStorage.setItem(TOKEN_KEY, token);
  notify();
}
export const getSessionToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);

export const getUserSecretHex = (): string | null => localStorage.getItem(SECRET_KEY);
export function setUserSecretHex(hex: string | null): void {
  if (hex === null) localStorage.removeItem(SECRET_KEY);
  else localStorage.setItem(SECRET_KEY, hex);
  notify();
}
export const useHasUserSecret = () => useStored(() => localStorage, SECRET_KEY) !== null;

/** The disclosure version the user acknowledged, so a changed disclosure asks again. */
export const useConsent = () => useStored(() => localStorage, CONSENT_KEY);
export function setConsent(version: string | null): void {
  if (version === null) localStorage.removeItem(CONSENT_KEY);
  else localStorage.setItem(CONSENT_KEY, version);
  notify();
}

let cachedRaw: string | null = null;
let cachedRecords: VerificationRecord[] = [];
function parse(raw: string | null): VerificationRecord[] {
  if (raw === cachedRaw) return cachedRecords;
  cachedRaw = raw;
  try {
    cachedRecords = raw ? (JSON.parse(raw) as VerificationRecord[]) : [];
  } catch {
    cachedRecords = [];
  }
  return cachedRecords;
}
const EMPTY: VerificationRecord[] = [];

/** Newest first. Null until the browser has hydrated. */
export function useVerifications(): VerificationRecord[] | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(HISTORY_KEY) ?? "",
    () => null,
  );
  return raw === null ? null : raw === "" ? EMPTY : parse(raw);
}

export function saveVerification(record: VerificationRecord): void {
  const all = parse(localStorage.getItem(HISTORY_KEY)).filter((r) => r.id !== record.id);
  const next = [{ ...record, updatedAt: Date.now() }, ...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  notify();
}

export function clearVerifications(): void {
  localStorage.removeItem(HISTORY_KEY);
  notify();
}
