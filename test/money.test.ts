import { describe, expect, it } from "vitest";
import {
  annualize,
  MAX_AMOUNT_MINOR_UNITS,
  meetsThreshold,
  MoneyError,
  mulDivRoundHalfUp,
  parseAmount,
  withinTolerance,
} from "../lib/money.ts";

describe("parseAmount", () => {
  it("scales by the currency's own precision", () => {
    expect(parseAmount("85000", "USD")).toBe(8_500_000n);
    expect(parseAmount("85000.5", "USD")).toBe(8_500_050n);
    expect(parseAmount("85000.05", "USD")).toBe(8_500_005n);
    expect(parseAmount("85000", "JPY")).toBe(85_000n);
    expect(parseAmount("1.234", "KWD")).toBe(1_234n);
    expect(parseAmount("0", "USD")).toBe(0n);
  });

  it("is exact where binary floating point is not", () => {
    // 0.1 + 0.2 !== 0.3 and 1.15 * 100 === 114.99999999999999 in IEEE-754.
    expect(parseAmount("0.10", "USD") + parseAmount("0.20", "USD")).toBe(parseAmount("0.30", "USD"));
    expect(parseAmount("1.15", "USD")).toBe(115n);
    expect(parseAmount("9007199254740993", "JPY")).toBe(9_007_199_254_740_993n); // 2^53 + 1
  });

  it("rejects anything not exactly representable", () => {
    for (const bad of ["", "-1", "+1", "1e5", "1,000", "1.", ".5", " 1", "1.005", "abc", "0x10"]) {
      expect(() => parseAmount(bad, "USD"), bad).toThrow(MoneyError);
    }
    expect(() => parseAmount("1.5", "JPY")).toThrow(MoneyError);
    expect(() => parseAmount("1", "XXX")).toThrow("unsupported currency");
    expect(() => parseAmount((MAX_AMOUNT_MINOR_UNITS + 1n).toString(), "JPY")).toThrow("exceeds Uint<64>");
  });
});

describe("annualize", () => {
  it("multiplies by exact integer factors", () => {
    expect(annualize(8_500_000n, "annual")).toBe(8_500_000n);
    expect(annualize(708_333n, "monthly")).toBe(8_499_996n);
    expect(annualize(163_462n, "weekly")).toBe(8_500_024n);
  });

  it("refuses to guess a period for per_document amounts", () => {
    expect(annualize(8_500_000n, "per_document")).toBeUndefined();
  });

  it("rejects negative amounts and results that overflow the on-chain field", () => {
    expect(() => annualize(-1n, "monthly")).toThrow(MoneyError);
    expect(() => annualize(MAX_AMOUNT_MINOR_UNITS, "monthly")).toThrow("exceeds Uint<64>");
  });
});

describe("threshold boundary", () => {
  const threshold = parseAmount("85000", "USD");

  it("passes at exactly the threshold and fails one minor unit below", () => {
    expect(meetsThreshold(threshold, threshold)).toBe(true);
    expect(meetsThreshold(threshold - 1n, threshold)).toBe(false);
    expect(meetsThreshold(threshold + 1n, threshold)).toBe(true);
  });

  it("a monthly figure one cent short stays short after annualization", () => {
    // 85000 / 12 = 7083.33...; 7083.33 * 12 = 84999.96 must not round up to pass.
    const annual = annualize(parseAmount("7083.33", "USD"), "monthly");
    expect(annual).toBe(8_499_996n);
    expect(meetsThreshold(annual!, threshold)).toBe(false);
    expect(meetsThreshold(annualize(parseAmount("7083.34", "USD"), "monthly")!, threshold)).toBe(true);
  });
});

describe("mulDivRoundHalfUp", () => {
  it("rounds half up at the boundary", () => {
    expect(mulDivRoundHalfUp(1n, 1n, 2n)).toBe(1n); // 0.5 -> 1
    expect(mulDivRoundHalfUp(1n, 49n, 100n)).toBe(0n); // 0.49 -> 0
    expect(mulDivRoundHalfUp(3n, 1n, 2n)).toBe(2n); // 1.5 -> 2
    expect(mulDivRoundHalfUp(5n, 1n, 2n)).toBe(3n); // 2.5 -> 3 (not banker's rounding)
    expect(mulDivRoundHalfUp(10_000n, 8_312n, 10_000n)).toBe(8_312n);
    expect(mulDivRoundHalfUp(12_345n, 8_312n, 10_000n)).toBe(10_261n); // 10261.164
  });

  it("stays exact beyond 2^53", () => {
    const big = 2n ** 63n + 1n;
    expect(mulDivRoundHalfUp(big, 3n, 3n)).toBe(big);
  });

  it("rejects invalid ratios", () => {
    expect(() => mulDivRoundHalfUp(1n, 1n, 0n)).toThrow(MoneyError);
    expect(() => mulDivRoundHalfUp(-1n, 1n, 1n)).toThrow(MoneyError);
  });
});

describe("withinTolerance", () => {
  it("compares in basis points of the larger value, inclusive", () => {
    expect(withinTolerance(10_000n, 9_900n, 100n)).toBe(true); // exactly 1%
    expect(withinTolerance(10_000n, 9_899n, 100n)).toBe(false);
    expect(withinTolerance(9_900n, 10_000n, 100n)).toBe(true); // symmetric
    expect(withinTolerance(0n, 0n, 0n)).toBe(true);
  });
});
