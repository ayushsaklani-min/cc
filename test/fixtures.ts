import type { Extraction } from "../lib/extraction-schema.ts";
import type { Identity, Policy } from "../lib/policy-engine.ts";

export const POLICY: Policy = {
  id: "income-v1",
  version: 1,
  currency: "USD",
  thresholdMinorUnits: 8_500_000n,
  allowedDocumentTypes: ["tax_return", "payslip", "employer_letter"],
  issuerAllowList: ["Internal Revenue Service", "Acme Payroll Inc."],
  freshnessDays: 90,
  maxPlausibleAnnualMinorUnits: 5_000_000_000n,
  nameMatchPerMille: 850,
};

export const TODAY = "2026-10-09";
export const kyc: Identity = { method: "govIdCamera", verifiedName: "Maria Jose Garcia" };

export const extraction = (o: Partial<Extraction> = {}): Extraction => ({
  documentType: "payslip",
  holderName: "Maria José García",
  issuer: "ACME Payroll, Inc",
  documentDate: "2026-09-30",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  amountMinorUnits: 750_000n,
  currency: "USD",
  amountPeriod: "monthly",
  evidence: [{ page: 1, quote: "Gross pay 7,500.00" }],
  ambiguous: false,
  ambiguityReason: "",
  ...o,
});
