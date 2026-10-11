// The in-browser sandbox must tell the truth: every scenario it offers has to
// end the way it claims, on the real compiled contract.
import { describe, expect, it } from "vitest";
import { runScenario, Sandbox, SCENARIOS } from "../lib/sandbox.ts";
import { SCENARIO_INFO } from "../lib/sandbox-scenarios.ts";

describe("sandbox scenarios", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.id}: ${scenario.expected === "accepted" ? "is accepted" : `is refused with "${scenario.expected}"`}`, () => {
      const result = runScenario(scenario);
      expect(result.asExpected).toBe(true);
      if (scenario.expected === "accepted") {
        expect(result.outcome).toBe("accepted");
      } else {
        expect(result.outcome).toBe("refused");
        expect(result.message).toBe(scenario.expected);
      }
    });
  }

  it("the listing shown before the runtime loads matches what is executed", () => {
    expect(SCENARIO_INFO).toEqual(SCENARIOS.map(({ id, group, title, attempt, expected }) => ({ id, group, title, attempt, expected })));
  });

  it("scenario ids are unique", () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });

  it("a successful verification leaves one status and one nullifier, and nothing else", () => {
    const result = runScenario(SCENARIOS.find((s) => s.id === "verify")!);
    expect(result.ledger.verified).toHaveLength(1);
    expect(result.ledger.verified[0]!.subject).toBe(result.subject);
    expect(result.ledger.nullifiersUsed).toBe(1);
    expect(result.ledger.revoked).toHaveLength(0);
  });

  it("a refused submission leaves the ledger untouched", () => {
    for (const id of ["wrong-owner", "tamper-amount", "rogue-oracle", "not-eligible", "low-assurance", "expired"]) {
      const result = runScenario(SCENARIOS.find((s) => s.id === id)!);
      expect(result.ledger).toEqual({ verified: [], revoked: [], nullifiersUsed: 0 });
    }
  });

  it("revocation clears the status and records the epoch", () => {
    const result = runScenario(SCENARIOS.find((s) => s.id === "revoke")!);
    expect(result.ledger.verified).toHaveLength(0);
    expect(result.ledger.revoked.map((r) => r.subject)).toEqual([result.subject]);
  });

  it("each deployment has its own keys and subject", () => {
    expect(Buffer.from(new Sandbox().subject).toString("hex")).not.toBe(Buffer.from(new Sandbox().subject).toString("hex"));
  });
});
