// Deterministic, versioned policy (spec section 7). This is the only code that
// turns an extraction into a decision. It is a pure function of its arguments:
// no clock, no network, no randomness, and no floating point in any amount.
import type { DocumentType, Extraction } from "./extraction-schema.ts";
import { annualize, meetsThreshold, MoneyError, withinTolerance } from "./money.ts";

export type VerificationMethod = "emailOtp" | "walletSignature" | "govIdCamera";

/** Spec section 9. The signed assuranceLevel is authoritative; the method name is metadata. */
export const ASSURANCE_OF_METHOD: Readonly<Record<VerificationMethod, 1 | 2 | 3>> = {
  emailOtp: 1,
  walletSignature: 2,
  govIdCamera: 3,
};

export interface Identity {
  method: VerificationMethod;
  /** The verified legal name. Only a government-ID check establishes one. */
  verifiedName?: string;
}

export interface Policy {
  id: string;
  version: number;
  currency: string;
  thresholdMinorUnits: bigint;
  allowedDocumentTypes: readonly DocumentType[];
  /** Issuers accepted for this policy, compared after normalization. */
  issuerAllowList: readonly string[];
  /** Maximum document age in days. */
  freshnessDays: number;
  /** Annual amounts above this are implausible and go to a human. */
  maxPlausibleAnnualMinorUnits: bigint;
  /** Minimum name similarity in thousandths (850 = 0.85). */
  nameMatchPerMille: number;
  /** If set, a second independent extraction must agree within this many basis points. */
  crossCheckToleranceBps?: bigint;
}

export type ReasonCode =
  | "document_type_not_allowed"
  | "issuer_not_allowed"
  | "holder_name_mismatch"
  | "document_stale"
  | "document_date_in_future"
  | "currency_not_supported"
  | "below_threshold"
  | "ambiguous_extraction"
  | "no_evidence"
  | "amount_period_unknown"
  | "amount_implausible"
  | "crosscheck_unavailable"
  | "crosscheck_not_independent"
  | "crosscheck_disagreement";

export type Verdict =
  | {
      status: "eligible";
      assuranceLevel: 1 | 2 | 3;
      /** Annualized amount, in minor units of `currency`. */
      amountMinorUnits: bigint;
      currency: string;
      method: VerificationMethod;
    }
  | { status: "ineligible"; reasonCode: ReasonCode }
  | { status: "review"; reasonCode: ReasonCode };

export interface CrossCheck {
  extractorId: string;
  primaryExtractorId: string;
  extraction: Extraction;
}

const ineligible = (reasonCode: ReasonCode): Verdict => ({ status: "ineligible", reasonCode });
const review = (reasonCode: ReasonCode): Verdict => ({ status: "review", reasonCode });

/** Case, accents, punctuation and token order do not distinguish two names. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** Similarity = 1 - editDistance / longerLength, compared in integers. */
export function namesMatch(a: string, b: string, thresholdPerMille: number): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  const longer = Math.max(x.length, y.length);
  if (longer === 0) return false;
  return levenshtein(x, y) * 1000 <= (1000 - thresholdPerMille) * longer;
}

const normalizeIssuer = (s: string) => normalizeName(s);

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);

/**
 * @param today the decision date as YYYY-MM-DD (UTC), supplied by the caller.
 * @param crossCheck a second extraction from a different model or provider.
 */
export function evaluatePolicy(
  extracted: Extraction,
  identity: Identity,
  policy: Policy,
  today: string,
  crossCheck?: CrossCheck,
): Verdict {
  // 2. Document type and issuer allow-lists.
  if (!policy.allowedDocumentTypes.includes(extracted.documentType)) return ineligible("document_type_not_allowed");
  const issuer = normalizeIssuer(extracted.issuer);
  if (!policy.issuerAllowList.some((allowed) => normalizeIssuer(allowed) === issuer)) {
    return ineligible("issuer_not_allowed");
  }

  // 3. Holder name against the verified identity. Without a verified name
  // there is nothing to match, and the assurance tier already reflects that.
  if (identity.verifiedName !== undefined && !namesMatch(extracted.holderName, identity.verifiedName, policy.nameMatchPerMille)) {
    return ineligible("holder_name_mismatch");
  }
  const assuranceLevel = identity.verifiedName !== undefined ? ASSURANCE_OF_METHOD[identity.method] : capWithoutName(identity.method);

  // 4. Freshness.
  const age = daysBetween(extracted.documentDate, today);
  if (age < 0) return ineligible("document_date_in_future");
  if (age > policy.freshnessDays) return ineligible("document_stale");

  // 5. Currency: no FX policy is defined, so only the policy currency is accepted.
  if (extracted.currency !== policy.currency) return ineligible("currency_not_supported");

  // 6. Ambiguity and sanity bounds go to a human, never to a signature.
  if (extracted.ambiguous) return review("ambiguous_extraction");
  if (extracted.evidence.length === 0) return review("no_evidence");

  let annual: bigint | undefined;
  try {
    annual = annualize(extracted.amountMinorUnits, extracted.amountPeriod);
  } catch (e) {
    if (e instanceof MoneyError) return review("amount_implausible");
    throw e;
  }
  if (annual === undefined) return review("amount_period_unknown");
  if (annual > policy.maxPlausibleAnnualMinorUnits) return review("amount_implausible");

  // 7. Independent cross-check for high-value policies (M2).
  if (policy.crossCheckToleranceBps !== undefined) {
    if (crossCheck === undefined) return review("crosscheck_unavailable");
    if (crossCheck.extractorId === crossCheck.primaryExtractorId) return review("crosscheck_not_independent");
    const other = crossCheck.extraction;
    let otherAnnual: bigint | undefined;
    try {
      otherAnnual = annualize(other.amountMinorUnits, other.amountPeriod);
    } catch {
      otherAnnual = undefined;
    }
    if (
      otherAnnual === undefined ||
      other.currency !== extracted.currency ||
      other.ambiguous ||
      !withinTolerance(annual, otherAnnual, policy.crossCheckToleranceBps)
    ) {
      return review("crosscheck_disagreement");
    }
    // Decide on the lower of the two readings.
    if (otherAnnual < annual) annual = otherAnnual;
  }

  // 9. Threshold, in integer minor units.
  if (!meetsThreshold(annual, policy.thresholdMinorUnits)) return ineligible("below_threshold");

  return { status: "eligible", assuranceLevel, amountMinorUnits: annual, currency: policy.currency, method: identity.method };
}

/** A government-ID method that produced no verified name cannot claim the high tier. */
function capWithoutName(method: VerificationMethod): 1 | 2 | 3 {
  const level = ASSURANCE_OF_METHOD[method];
  return level === 3 ? 2 : level;
}
