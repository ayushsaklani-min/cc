// Extraction schema (spec section 7). Model output is untrusted input: it is
// validated strictly here and then only ever read by the deterministic policy
// engine. A value that fails validation aborts the request with no signature.

export const DOCUMENT_TYPES = ["tax_return", "payslip", "bank_statement", "employer_letter", "other"] as const;
export const AMOUNT_PERIODS = ["annual", "monthly", "weekly", "per_document"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type ExtractedPeriod = (typeof AMOUNT_PERIODS)[number];

export interface Evidence {
  page: number;
  quote: string;
}

export interface Extraction {
  documentType: DocumentType;
  holderName: string;
  issuer: string;
  /** ISO calendar dates, YYYY-MM-DD. */
  documentDate: string;
  periodStart: string;
  periodEnd: string;
  /** Scaled integer in the currency's minor units; never a float. */
  amountMinorUnits: bigint;
  /** ISO 4217 alphabetic code. */
  currency: string;
  amountPeriod: ExtractedPeriod;
  evidence: Evidence[];
  ambiguous: boolean;
  ambiguityReason: string;
}

/** Produces an {@link Extraction} from document bytes, or throws. */
export interface Extractor {
  /** Identifies the model/provider, so an "independent" cross-check can be told apart (M2). */
  readonly id: string;
  extract(document: Uint8Array, mimeType: string): Promise<Extraction>;
}

/** JSON Schema handed to the model for structured output. Mirrors {@link parseExtraction}. */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "holderName",
    "issuer",
    "documentDate",
    "periodStart",
    "periodEnd",
    "amountMinorUnits",
    "currency",
    "amountPeriod",
    "evidence",
    "ambiguous",
    "ambiguityReason",
  ],
  properties: {
    documentType: { type: "string", enum: DOCUMENT_TYPES },
    holderName: { type: "string" },
    issuer: { type: "string" },
    documentDate: { type: "string", format: "date" },
    periodStart: { type: "string", format: "date" },
    periodEnd: { type: "string", format: "date" },
    // A string of digits, so large values are not rounded through a JSON double.
    amountMinorUnits: { type: "string", pattern: "^[0-9]{1,20}$" },
    currency: { type: "string", pattern: "^[A-Z]{3}$" },
    amountPeriod: { type: "string", enum: AMOUNT_PERIODS },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["page", "quote"],
        properties: { page: { type: "integer", minimum: 1 }, quote: { type: "string", maxLength: 200 } },
      },
    },
    ambiguous: { type: "boolean" },
    ambiguityReason: { type: "string" },
  },
} as const;

export class ExtractionValidationError extends Error {}

const fail = (what: string): never => {
  throw new ExtractionValidationError(what);
};

const MAX_TEXT = 512;

function text(v: unknown, field: string, max = MAX_TEXT): string {
  if (typeof v !== "string" || v.length > max) fail(`${field}: expected a string of at most ${max} characters`);
  return v as string;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== "string" || !allowed.includes(v as T)) fail(`${field}: not an allowed value`);
  return v as T;
}

function isoDate(v: unknown, field: string): string {
  const s = text(v, field, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return fail(`${field}: expected YYYY-MM-DD`);
  const d = new Date(`${s}T00:00:00Z`);
  // Rejects dates the calendar does not have (2026-02-30), which Date would roll over.
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) fail(`${field}: not a real date`);
  return s;
}

function minorUnits(v: unknown): bigint {
  if (typeof v === "string" && /^[0-9]{1,20}$/.test(v)) return BigInt(v);
  // A JSON number is accepted only where it is certainly exact.
  if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0) return BigInt(v);
  return fail("amountMinorUnits: expected a non-negative integer");
}

function evidence(v: unknown): Evidence[] {
  if (!Array.isArray(v) || v.length > 32) return fail("evidence: expected an array of at most 32 items");
  return v.map((item, i) => {
    const o = exactObject(item, ["page", "quote"], `evidence[${i}]`);
    const page = o.page;
    if (typeof page !== "number" || !Number.isInteger(page) || page < 1) fail(`evidence[${i}].page: expected a page number`);
    return { page: page as number, quote: text(o.quote, `evidence[${i}].quote`, 200) };
  });
}

function exactObject(v: unknown, keys: readonly string[], field: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return fail(`${field}: expected an object`);
  const o = v as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${field}: unexpected property`);
  for (const k of keys) if (!(k in o)) fail(`${field}: missing ${k}`);
  return o;
}

/** Strictly validates parsed model output. Unknown, missing or mistyped fields all throw. */
export function parseExtraction(value: unknown): Extraction {
  const o = exactObject(value, EXTRACTION_JSON_SCHEMA.required, "extraction");
  const out: Extraction = {
    documentType: oneOf(o.documentType, DOCUMENT_TYPES, "documentType"),
    holderName: text(o.holderName, "holderName"),
    issuer: text(o.issuer, "issuer"),
    documentDate: isoDate(o.documentDate, "documentDate"),
    periodStart: isoDate(o.periodStart, "periodStart"),
    periodEnd: isoDate(o.periodEnd, "periodEnd"),
    amountMinorUnits: minorUnits(o.amountMinorUnits),
    currency: text(o.currency, "currency", 3),
    amountPeriod: oneOf(o.amountPeriod, AMOUNT_PERIODS, "amountPeriod"),
    evidence: evidence(o.evidence),
    ambiguous: typeof o.ambiguous === "boolean" ? o.ambiguous : fail("ambiguous: expected a boolean"),
    ambiguityReason: text(o.ambiguityReason, "ambiguityReason"),
  };
  if (!/^[A-Z]{3}$/.test(out.currency)) fail("currency: expected an ISO 4217 code");
  if (out.periodStart > out.periodEnd) fail("period: start is after end");
  return out;
}
