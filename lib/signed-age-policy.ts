// The "over N" policy, decided from an issuer-signed PAN Verification Record.
// Nothing in the document is believed until its signature has been verified
// against a pinned issuer, and no model is involved: the record is read by rule.
import { ageOn, PanRecordError, parsePanRecord, pdfText } from "./pan-record.ts";
import { SignedPdfError, verifySignedPdf, type TrustedSigner } from "./signed-pdf.ts";

export interface SignedAgeRule {
  /** Policy identifier, as sealed into the contract deployed for it. */
  id: string;
  version: number;
  minimumAge: number;
  /** A record signed longer ago than this is refused. */
  freshnessSeconds: number;
  trustedSigners: readonly TrustedSigner[];
}

export type SignedAgeReason =
  | "document_not_signed"
  | "signature_invalid"
  | "signer_not_trusted"
  | "unsupported_signature"
  | "not_a_pan_record"
  | "unreadable_record"
  | "document_stale"
  | "document_date_in_future"
  | "under_minimum_age";

export type SignedAgeVerdict =
  | {
      status: "eligible";
      /** Identifies the person the record is about, for the one-person-one-subject rule. Never returned or logged. */
      holderKey: string;
      signerName: string;
    }
  | { status: "ineligible"; reasonCode: SignedAgeReason };

const SIGNATURE_REASON: Record<SignedPdfError["code"], SignedAgeReason> = {
  not_signed: "document_not_signed",
  multiple_signatures: "unsupported_signature",
  signature_not_over_whole_file: "signature_invalid",
  unsupported_signature: "unsupported_signature",
  signature_invalid: "signature_invalid",
  signer_not_trusted: "signer_not_trusted",
  signer_certificate_not_valid: "signature_invalid",
};

/** @param now seconds since the Unix epoch */
export async function evaluateSignedAge(document: Uint8Array, mimeType: string, rule: SignedAgeRule, now: number): Promise<SignedAgeVerdict> {
  const no = (reasonCode: SignedAgeReason): SignedAgeVerdict => ({ status: "ineligible", reasonCode });
  if (mimeType !== "application/pdf") return no("document_not_signed");

  let signature;
  try {
    signature = verifySignedPdf(document, rule.trustedSigners);
  } catch (e) {
    if (e instanceof SignedPdfError) return no(SIGNATURE_REASON[e.code]);
    throw e;
  }
  // A small allowance for clock difference with the issuer.
  if (signature.signedAt > now + 300) return no("document_date_in_future");
  if (now - signature.signedAt > rule.freshnessSeconds) return no("document_stale");

  let record;
  try {
    record = parsePanRecord(await pdfText(document));
  } catch (e) {
    if (e instanceof PanRecordError) return no(e.code);
    throw e;
  }
  if (ageOn(record.dateOfBirth, now) < rule.minimumAge) return no("under_minimum_age");
  return { status: "eligible", holderKey: `pan-record:v1:${record.pan}`, signerName: signature.signer.name };
}
