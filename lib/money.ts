// Integer money (spec section 7, H4). Every amount in the decision path is a
// bigint count of minor units. There is deliberately no number-typed amount
// anywhere in this module: IEEE-754 must not reach a threshold comparison.

/** ISO 4217 minor-unit exponents for the currencies a policy may name. */
const MINOR_UNIT_EXPONENT: Readonly<Record<string, number>> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  INR: 2,
  CAD: 2,
  AUD: 2,
  CHF: 2,
  SGD: 2,
  JPY: 0,
  KRW: 0,
  KWD: 3,
  BHD: 3,
};

export type AmountPeriod = "annual" | "monthly" | "weekly" | "per_document";

/** Largest value the on-chain `amountMinorUnits: Uint<64>` field can carry. */
export const MAX_AMOUNT_MINOR_UNITS = 2n ** 64n - 1n;

export class MoneyError extends Error {}

export function minorUnitExponent(currency: string): number {
  const e = MINOR_UNIT_EXPONENT[currency];
  if (e === undefined) throw new MoneyError(`unsupported currency: ${currency}`);
  return e;
}

/**
 * Parses a plain decimal string ("85000", "85000.50") into minor units.
 * Rejects anything that is not exactly representable in the currency:
 * signs, exponents, separators, or more fraction digits than the currency has.
 */
export function parseAmount(decimal: string, currency: string): bigint {
  const exponent = minorUnitExponent(currency);
  const m = /^(\d+)(?:\.(\d+))?$/.exec(decimal);
  if (!m) throw new MoneyError("malformed amount");
  const whole = m[1] ?? "";
  const fraction = m[2] ?? "";
  if (fraction.length > exponent) throw new MoneyError("more precision than the currency allows");
  return checked(BigInt(whole + fraction.padEnd(exponent, "0")));
}

function checked(amountMinorUnits: bigint): bigint {
  if (amountMinorUnits < 0n) throw new MoneyError("negative amount");
  if (amountMinorUnits > MAX_AMOUNT_MINOR_UNITS) throw new MoneyError("amount exceeds Uint<64>");
  return amountMinorUnits;
}

// Annualization factors. A year is 12 months or 52 weeks; both are exact
// integer multiplications, so annualization itself never rounds.
const PERIODS_PER_YEAR: Readonly<Record<Exclude<AmountPeriod, "per_document">, bigint>> = {
  annual: 1n,
  monthly: 12n,
  weekly: 52n,
};

/**
 * Annualizes an amount stated for one period.
 * @returns undefined for `per_document`, which carries no period and must go
 * to manual review rather than be guessed at.
 */
export function annualize(amountMinorUnits: bigint, period: AmountPeriod): bigint | undefined {
  checked(amountMinorUnits);
  if (period === "per_document") return undefined;
  return checked(amountMinorUnits * PERIODS_PER_YEAR[period]);
}

/**
 * floor-free a * numerator / denominator, rounded half-up. The one place a
 * division (FX conversion, tolerance bands) is allowed to round.
 */
export function mulDivRoundHalfUp(a: bigint, numerator: bigint, denominator: bigint): bigint {
  if (a < 0n || numerator < 0n || denominator <= 0n) throw new MoneyError("invalid ratio");
  return (2n * a * numerator + denominator) / (2n * denominator);
}

export function meetsThreshold(annualMinorUnits: bigint, thresholdMinorUnits: bigint): boolean {
  return checked(annualMinorUnits) >= checked(thresholdMinorUnits);
}

/** Whether two independent extractions agree within `toleranceBps` basis points of the larger. */
export function withinTolerance(a: bigint, b: bigint, toleranceBps: bigint): boolean {
  const [low, high] = a <= b ? [a, b] : [b, a];
  return (high - low) * 10_000n <= high * toleranceBps;
}
