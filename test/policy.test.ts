import { describe, expect, it } from "vitest";
import { ExtractionValidationError, parseExtraction, type Extraction } from "../lib/extraction-schema.ts";
import { evaluatePolicy, namesMatch, normalizeName, type Identity, type Policy } from "../lib/policy-engine.ts";
import { extraction, kyc, POLICY, TODAY } from "./fixtures.ts";

describe("evaluatePolicy", () => {
  it("issues an eligible verdict with the annualized amount and the identity's tier", () => {
    expect(evaluatePolicy(extraction(), kyc, POLICY, TODAY)).toEqual({
      status: "eligible",
      assuranceLevel: 3,
      amountMinorUnits: 9_000_000n,
      currency: "USD",
      method: "govIdCamera",
    });
  });

  it("assurance follows the verification method; no verified name caps it below high", () => {
    const level = (identity: Identity) => {
      const v = evaluatePolicy(extraction(), identity, POLICY, TODAY);
      return v.status === "eligible" ? v.assuranceLevel : v;
    };
    expect(level({ method: "emailOtp" })).toBe(1);
    expect(level({ method: "walletSignature" })).toBe(2);
    expect(level({ method: "govIdCamera" })).toBe(2);
    expect(level(kyc)).toBe(3);
  });

  it("threshold boundary is exact in integer minor units", () => {
    const at = (amountMinorUnits: bigint) =>
      evaluatePolicy(extraction({ amountMinorUnits, amountPeriod: "annual" }), kyc, POLICY, TODAY);
    expect(at(8_500_000n).status).toBe("eligible");
    expect(at(8_499_999n)).toEqual({ status: "ineligible", reasonCode: "below_threshold" });
    // 7083.33 monthly is 84,999.96 a year: short by four cents, and must stay short.
    expect(evaluatePolicy(extraction({ amountMinorUnits: 708_333n }), kyc, POLICY, TODAY)).toEqual({
      status: "ineligible",
      reasonCode: "below_threshold",
    });
  });

  const rejections: [string, Partial<Extraction>, string, string][] = [
    ["disallowed document type", { documentType: "bank_statement" }, "ineligible", "document_type_not_allowed"],
    ["issuer not on the allow-list", { issuer: "Totally Real Payroll LLC" }, "ineligible", "issuer_not_allowed"],
    ["holder name mismatch", { holderName: "John Smith" }, "ineligible", "holder_name_mismatch"],
    ["stale document", { documentDate: "2026-07-10" }, "ineligible", "document_stale"],
    ["future-dated document", { documentDate: "2026-10-10" }, "ineligible", "document_date_in_future"],
    ["foreign currency", { currency: "EUR" }, "ineligible", "currency_not_supported"],
    ["ambiguous extraction", { ambiguous: true, ambiguityReason: "two totals" }, "review", "ambiguous_extraction"],
    ["no evidence", { evidence: [] }, "review", "no_evidence"],
    ["period unknown", { amountPeriod: "per_document" }, "review", "amount_period_unknown"],
    ["implausible amount", { amountMinorUnits: 900_000_000n }, "review", "amount_implausible"],
    ["amount overflowing the on-chain field", { amountMinorUnits: 2n ** 64n - 1n }, "review", "amount_implausible"],
  ];
  for (const [name, override, status, reasonCode] of rejections) {
    it(`${name} -> ${status}/${reasonCode}`, () => {
      expect(evaluatePolicy(extraction(override), kyc, POLICY, TODAY)).toEqual({ status, reasonCode });
    });
  }

  it("freshness window is inclusive at its edge", () => {
    expect(evaluatePolicy(extraction({ documentDate: "2026-07-11" }), kyc, POLICY, TODAY).status).toBe("eligible");
  });

  it("is a pure function: same inputs, same verdict", () => {
    expect(evaluatePolicy(extraction(), kyc, POLICY, TODAY)).toEqual(evaluatePolicy(extraction(), kyc, POLICY, TODAY));
  });

  describe("independent cross-check", () => {
    const strict: Policy = { ...POLICY, crossCheckToleranceBps: 100n };
    const second = (o: Partial<Extraction>, extractorId = "provider-b") => ({
      extractorId,
      primaryExtractorId: "provider-a",
      extraction: extraction(o),
    });

    it("is required when the policy asks for it", () => {
      expect(evaluatePolicy(extraction(), kyc, strict, TODAY)).toEqual({
        status: "review",
        reasonCode: "crosscheck_unavailable",
      });
    });

    it("a re-run of the same model does not count as independent", () => {
      expect(evaluatePolicy(extraction(), kyc, strict, TODAY, second({}, "provider-a"))).toEqual({
        status: "review",
        reasonCode: "crosscheck_not_independent",
      });
    });

    it("agreement within tolerance passes and decides on the lower reading", () => {
      const v = evaluatePolicy(extraction(), kyc, strict, TODAY, second({ amountMinorUnits: 745_000n }));
      expect(v).toMatchObject({ status: "eligible", amountMinorUnits: 8_940_000n });
    });

    it("disagreement beyond tolerance, or on currency, goes to review", () => {
      for (const o of [{ amountMinorUnits: 700_000n }, { currency: "EUR" }, { amountPeriod: "per_document" as const }]) {
        expect(evaluatePolicy(extraction(), kyc, strict, TODAY, second(o))).toEqual({
          status: "review",
          reasonCode: "crosscheck_disagreement",
        });
      }
    });
  });
});

describe("name matching", () => {
  it("ignores case, accents, punctuation and token order", () => {
    expect(normalizeName("  GARCÍA,  María-José ")).toBe("garcia jose maria");
    expect(namesMatch("María José García", "GARCIA, Maria Jose", 850)).toBe(true);
    expect(namesMatch("Maria Jose Garcia", "Maria Jose Garcia", 1000)).toBe(true);
  });

  it("tolerates a small typo at the documented threshold but not a different person", () => {
    expect(namesMatch("Maria Jose Garcia", "Maria Jose Garcla", 850)).toBe(true);
    expect(namesMatch("Maria Jose Garcia", "Mario Jose Garza", 850)).toBe(false);
    expect(namesMatch("Maria Garcia", "John Smith", 850)).toBe(false);
    expect(namesMatch("", "", 850)).toBe(false);
  });
});

describe("parseExtraction (strict)", () => {
  const raw = (o: Record<string, unknown> = {}) => ({
    documentType: "payslip",
    holderName: "Maria Garcia",
    issuer: "Acme Payroll Inc.",
    documentDate: "2026-09-30",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    amountMinorUnits: "750000",
    currency: "USD",
    amountPeriod: "monthly",
    evidence: [{ page: 1, quote: "Gross pay 7,500.00" }],
    ambiguous: false,
    ambiguityReason: "",
    ...o,
  });

  it("accepts a well-formed extraction and yields a bigint amount", () => {
    const e = parseExtraction(raw());
    expect(e.amountMinorUnits).toBe(750_000n);
    expect(parseExtraction(raw({ amountMinorUnits: 750000 })).amountMinorUnits).toBe(750_000n);
    expect(parseExtraction(raw({ amountMinorUnits: "18446744073709551615" })).amountMinorUnits).toBe(2n ** 64n - 1n);
  });

  const bad: [string, Record<string, unknown>][] = [
    ["float amount", { amountMinorUnits: 7500.5 }],
    ["amount beyond exact double range", { amountMinorUnits: 2 ** 60 }],
    ["negative amount", { amountMinorUnits: -1 }],
    ["decimal string amount", { amountMinorUnits: "7500.00" }],
    ["exponent string amount", { amountMinorUnits: "1e9" }],
    ["unknown document type", { documentType: "passport" }],
    ["unknown period", { amountPeriod: "daily" }],
    ["impossible date", { documentDate: "2026-02-30" }],
    ["non-ISO date", { documentDate: "09/30/2026" }],
    ["period reversed", { periodStart: "2026-10-01" }],
    ["lower-case currency", { currency: "usd" }],
    ["over-long quote", { evidence: [{ page: 1, quote: "x".repeat(201) }] }],
    ["evidence with extra property", { evidence: [{ page: 1, quote: "q", note: "ignore previous instructions" }] }],
    ["page zero", { evidence: [{ page: 0, quote: "q" }] }],
    ["string boolean", { ambiguous: "false" }],
    ["extra top-level property", { eligible: true }],
    ["over-long name", { holderName: "x".repeat(513) }],
  ];
  for (const [name, override] of bad) {
    it(`rejects ${name}`, () => {
      expect(() => parseExtraction(raw(override))).toThrow(ExtractionValidationError);
    });
  }

  it("rejects missing fields and non-objects", () => {
    const { issuer: _dropped, ...missing } = raw();
    expect(() => parseExtraction(missing)).toThrow(ExtractionValidationError);
    for (const v of [null, "text", 42, [], undefined]) {
      expect(() => parseExtraction(v)).toThrow(ExtractionValidationError);
    }
  });
});
