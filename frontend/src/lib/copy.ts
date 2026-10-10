// User-facing wording for API reason codes and lifecycle phases. The API only
// ever returns codes; this is the single place they become sentences.
import type { Phase } from "./store";

export const PHASE_LABEL: Record<Phase, string> = {
  idle: "Not started",
  uploading: "Uploading",
  analyzing: "Processing",
  rejected: "Not eligible",
  review: "Needs review",
  attested: "Eligible — awaiting on-chain confirmation",
  proving: "Generating proof",
  submitting: "Submitting",
  confirmed: "Verified on Midnight",
  error: "Failed",
};

export type Tone = "neutral" | "progress" | "success" | "warning" | "error";

export const PHASE_TONE: Record<Phase, Tone> = {
  idle: "neutral",
  uploading: "progress",
  analyzing: "progress",
  rejected: "error",
  review: "warning",
  // Passing the policy is not a confirmed positive state, so it is not green.
  attested: "warning",
  proving: "progress",
  submitting: "progress",
  confirmed: "success",
  error: "error",
};

const REASONS: Record<string, string> = {
  below_threshold: "The income shown in the document is below this policy's threshold.",
  document_type_not_allowed: "This type of document is not accepted for this policy.",
  issuer_not_allowed: "The document's issuer is not on this policy's list of accepted issuers.",
  holder_name_mismatch: "The name on the document does not match your verified identity.",
  document_stale: "The document is older than this policy allows.",
  document_date_in_future: "The document is dated in the future.",
  currency_not_supported: "The document's currency is not supported by this policy.",
  subject_revoked: "Verification has been revoked for this identity, so a new attestation cannot be issued.",
  attestation_expired:
    "An attestation was already issued for this document and has just expired. Wait two minutes, then upload the document again to get a new one.",
  document_already_claimed: "This document has already been used by a different identity.",
  ambiguous_extraction: "The document could not be read unambiguously, so it needs a manual review.",
  no_evidence: "The figures could not be tied to specific text in the document, so it needs a manual review.",
  amount_period_unknown: "The document does not say what period the amount covers, so it needs a manual review.",
  amount_implausible: "The amount read from the document is outside the expected range, so it needs a manual review.",
  crosscheck_unavailable: "The independent second reading was not available, so it needs a manual review.",
  crosscheck_not_independent: "The independent second reading was not available, so it needs a manual review.",
  crosscheck_disagreement: "Two independent readings of the document disagreed, so it needs a manual review.",
  document_too_large: "The file is larger than the server accepts.",
  unsupported_document_type: "The file is not a supported document type.",
  subject_ownership_failed: "This browser could not prove it controls the identity it claimed.",
  unauthenticated: "Your session is no longer valid. Sign in again.",
  rate_limited: "Too many requests. Wait a minute before trying again.",
  request_in_progress: "This request is still being processed.",
  idempotency_key_reuse: "This verification was already submitted with a different document.",
  malformed_request: "The request was not accepted. Reload the page and try again.",
  not_configured: "The service is not fully configured.",
  network: "The server could not be reached.",
  no_wallet: "No compatible Midnight wallet was found in this browser. Install or enable Lace, then try again.",
  wallet_rejected: "The request was declined in the wallet. Nothing was submitted.",
  wallet_wrong_network: "The wallet is connected to a different network than this service uses.",
  wallet_disconnected: "The wallet is locked or disconnected. Unlock it and try again.",
  wallet_error: "The wallet could not complete the request. Nothing was confirmed.",
  submit_failed:
    "The transaction could not be proved or submitted. Check that the proof server set in your wallet is running, then try again.",
  identity_key_missing: "This browser no longer holds the identity key this attestation was issued to.",
  attestation_expired_unsubmitted: "The attestation expired before it was submitted. It cannot be used any more.",
  attestation_already_used: "This attestation has already been submitted once and cannot be used again.",
  wallet_identity_mismatch: "The identity key in this browser does not match the one the attestation was issued to.",
  attestation_no_longer_valid: "The attestation is no longer accepted, most likely because the signing key of the service was rotated.",
  status_would_move_backward: "You already hold a verification that is valid for longer than this one.",
  verification_failed: "Something went wrong on the server while processing the document.",
  internal_error: "Something went wrong on the server.",
  unexpected_response: "The server sent a response this page did not understand.",
};

export function reasonText(code: string | undefined): string {
  return (code && REASONS[code]) || "The verification could not be completed.";
}

export const ASSURANCE_LABEL: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

export const METHOD_LABEL: Record<string, string> = {
  emailOtp: "Email one-time code",
  walletSignature: "Wallet signature",
  govIdCamera: "Government ID check",
};

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  tax_return: "Tax return",
  payslip: "Payslip",
  bank_statement: "Bank statement",
  employer_letter: "Employer letter",
  other: "Other",
};

export const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(n % (1024 * 1024) === 0 ? 0 : 1)} MB`;
}

/** Minor units to a display amount, in integers end to end. */
export function formatMoney(minorUnits: string, currency: string): string {
  const exponent = currency === "JPY" || currency === "KRW" ? 0 : 2;
  const digits = minorUnits.padStart(exponent + 1, "0");
  const whole = digits.slice(0, digits.length - exponent).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = exponent > 0 ? digits.slice(-exponent) : "";
  return `${currency} ${whole}${fraction && fraction !== "00" ? `.${fraction}` : ""}`;
}

export function formatDateTime(epochMs: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(epochMs));
}

export function formatDuration(seconds: number): string {
  if (seconds % 86_400 === 0) return `${seconds / 86_400} day${seconds === 86_400 ? "" : "s"}`;
  if (seconds % 60 === 0) return `${seconds / 60} minutes`;
  return `${seconds} seconds`;
}
