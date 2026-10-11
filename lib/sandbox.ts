// A local deployment of the contract that runs in a browser tab. It executes the
// compiled contract's own code against the on-chain runtime VM, so every accept
// and every refusal is the real circuit logic. It does NOT generate or verify a
// zero-knowledge proof and does not touch a network: keys here are throwaway,
// created in the page, and nothing is sent anywhere.
//
// Uses only Web APIs, so it can be bundled for a browser.
import {
  createCircuitContext,
  createConstructorContext,
  encodeContractAddress,
  sampleContractAddress,
  type CircuitContext,
  type JubjubPoint,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
  pureCircuits,
  type Attestation,
  type OracleSignature,
} from "../contracts/managed/ciphercomply/contract/index.js";
import { JUBJUB_SUBGROUP_ORDER } from "./jubjub.ts";
import { witnesses, type PrivateState } from "./witnesses.ts";

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

function text32(s: string): Uint8Array {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(s));
  return out;
}

function randomScalar(): bigint {
  for (;;) {
    let x = 0n;
    for (const byte of random(64)) x = (x << 8n) | BigInt(byte);
    x %= JUBJUB_SUBGROUP_ORDER;
    if (x !== 0n) return x;
  }
}

/** A throwaway Schnorr key, signing exactly as the oracle does. */
export interface SandboxSigner {
  publicKey: JubjubPoint;
  sign(a: Attestation): OracleSignature;
}

export function sandboxSigner(): SandboxSigner {
  const secret = randomScalar();
  const publicKey = pureCircuits.schnorrPublicKey(secret);
  return {
    publicKey,
    sign(a) {
      const digest = pureCircuits.attestationDigest(a);
      const k = randomScalar();
      const announcement = pureCircuits.schnorrPublicKey(k);
      const c = pureCircuits.schnorrChallenge(announcement, publicKey, digest);
      return { announcement, response: (k + c * secret) % JUBJUB_SUBGROUP_ORDER };
    },
  };
}

/** What an observer of the public ledger can see. */
export interface LedgerView {
  verified: { subject: string; validUntil: number }[];
  revoked: { subject: string; epoch: number }[];
  nullifiersUsed: number;
}

export class Sandbox {
  private readonly contract = new Contract<PrivateState>(witnesses);
  private readonly address = sampleContractAddress();
  private readonly addressBytes = encodeContractAddress(this.address);
  readonly domain = text32("ciphercomply:sandbox:v1");
  readonly policyId = text32("income-usd-85k:v1");
  readonly adminSecret = random(32);
  readonly userSecret = random(32);
  readonly oracle = sandboxSigner();
  /** Chain time in seconds. Scenarios move it forward to simulate waiting. */
  time: number;
  private ctx: CircuitContext<PrivateState>;

  constructor(now = Math.floor(Date.now() / 1000)) {
    this.time = now;
    const ps: PrivateState = {
      userSecretKey: this.userSecret,
      adminSecretKey: this.adminSecret,
      attestation: undefined,
      signature: undefined,
    };
    const init = this.contract.initialState(
      createConstructorContext(ps, "0".repeat(64)),
      this.domain,
      this.policyId,
      2n,
      this.oracle.publicKey,
      pureCircuits.adminHashOf(this.adminSecret),
    );
    this.ctx = createCircuitContext(
      this.address,
      init.currentZswapLocalState,
      init.currentContractState,
      init.currentPrivateState,
      undefined,
      undefined,
      this.time,
    );
  }

  subjectOf(secret: Uint8Array): Uint8Array {
    return pureCircuits.subjectFor(this.addressBytes, pureCircuits.ownerKeyOf(secret));
  }

  get subject(): Uint8Array {
    return this.subjectOf(this.userSecret);
  }

  /** A well-formed attestation for this user: eligible, assurance 2, valid for a day. */
  attestation(overrides: Partial<Attestation> = {}): Attestation {
    const now = BigInt(this.time);
    return {
      schemaVersion: 1n,
      domain: this.domain,
      policyId: this.policyId,
      subject: this.subject,
      eligible: true,
      assuranceLevel: 2n,
      amountMinorUnits: 9_540_000n,
      currency: new TextEncoder().encode("USD"),
      issuedAt: now,
      expiresAt: now + 900n,
      statusValidUntil: now + 86_400n,
      nonce: random(32),
      documentHash: random(32),
      ...overrides,
    };
  }

  private context(ps: Partial<PrivateState>): CircuitContext<PrivateState> {
    return createCircuitContext(
      this.address,
      this.ctx.currentZswapLocalState,
      this.ctx.currentQueryContext.state,
      { ...this.ctx.currentPrivateState, ...ps },
      undefined,
      undefined,
      this.time,
    );
  }

  /** Runs verifyAndRegister. Throws, leaving the ledger untouched, if the circuit refuses. */
  submit(a: Attestation, signature: OracleSignature, userSecretKey = this.userSecret): void {
    this.ctx = this.contract.impureCircuits.verifyAndRegister(this.context({ attestation: a, signature, userSecretKey })).context;
  }

  revoke(subject: Uint8Array, atTime: number, adminSecretKey = this.adminSecret): void {
    this.ctx = this.contract.impureCircuits.revokeSubject(this.context({ adminSecretKey }), subject, BigInt(atTime)).context;
  }

  view(): LedgerView {
    const l = ledger(this.ctx.currentQueryContext.state);
    return {
      verified: [...l.verifiedUntil].map(([s, until]) => ({ subject: hex(s), validUntil: Number(until) })),
      revoked: [...l.revokedAt].map(([s, epoch]) => ({ subject: hex(s), epoch: Number(epoch) })),
      nullifiersUsed: Number(l.usedNullifiers.size()),
    };
  }
}

export interface Scenario {
  id: string;
  group: "honest" | "attack" | "admin";
  title: string;
  /** What is being attempted, in one sentence. */
  attempt: string;
  /** "accepted", or the contract's refusal message. */
  expected: "accepted" | string;
  /** The final step is the one under test; earlier steps set the scene and must succeed. */
  run(sb: Sandbox): void;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "verify",
    group: "honest",
    title: "An eligible person verifies",
    attempt: "The oracle signs an attestation for this user, and the user redeems it.",
    expected: "accepted",
    run(sb) {
      const a = sb.attestation();
      sb.submit(a, sb.oracle.sign(a));
    },
  },
  {
    id: "extend",
    group: "honest",
    title: "A later attestation extends the status",
    attempt: "The same user redeems a second attestation with a later validity date.",
    expected: "accepted",
    run(sb) {
      const first = sb.attestation();
      sb.submit(first, sb.oracle.sign(first));
      const second = sb.attestation({ statusValidUntil: BigInt(sb.time) + 172_800n });
      sb.submit(second, sb.oracle.sign(second));
    },
  },
  {
    id: "wrong-owner",
    group: "attack",
    title: "Someone else redeems your attestation",
    attempt: "A stranger takes a validly signed attestation and submits it with their own secret.",
    expected: "Subject mismatch",
    run(sb) {
      const a = sb.attestation();
      sb.submit(a, sb.oracle.sign(a), crypto.getRandomValues(new Uint8Array(32)));
    },
  },
  {
    id: "tamper-amount",
    group: "attack",
    title: "The amount is changed after signing",
    attempt: "The user edits the income figure inside an attestation the oracle already signed.",
    expected: "Invalid oracle signature",
    run(sb) {
      const a = sb.attestation();
      const signature = sb.oracle.sign(a);
      sb.submit({ ...a, amountMinorUnits: a.amountMinorUnits * 10n }, signature);
    },
  },
  {
    id: "tamper-validity",
    group: "attack",
    title: "The validity date is stretched",
    attempt: "The user gives themselves ten years of validity instead of the signed one day.",
    expected: "Invalid oracle signature",
    run(sb) {
      const a = sb.attestation();
      const signature = sb.oracle.sign(a);
      sb.submit({ ...a, statusValidUntil: a.statusValidUntil + 315_360_000n }, signature);
    },
  },
  {
    id: "rogue-oracle",
    group: "attack",
    title: "A fake oracle signs",
    attempt: "An attacker signs a perfect-looking attestation with a key that is not the registered oracle.",
    expected: "Invalid oracle signature",
    run(sb) {
      const a = sb.attestation();
      sb.submit(a, sandboxSigner().sign(a));
    },
  },
  {
    id: "not-eligible",
    group: "attack",
    title: "A signed \"not eligible\" result is redeemed",
    attempt: "The real oracle signs a negative result, and the user tries to register it anyway.",
    expected: "Not eligible",
    run(sb) {
      const a = sb.attestation({ eligible: false });
      sb.submit(a, sb.oracle.sign(a));
    },
  },
  {
    id: "low-assurance",
    group: "attack",
    title: "The identity check was too weak",
    attempt: "A validly signed attestation carries assurance level 1; the policy requires 2.",
    expected: "Assurance below policy minimum",
    run(sb) {
      const a = sb.attestation({ assuranceLevel: 1n });
      sb.submit(a, sb.oracle.sign(a));
    },
  },
  {
    id: "expired",
    group: "attack",
    title: "An attestation is used too late",
    attempt: "The user waits 16 minutes; an attestation lives for 15.",
    expected: "Attestation expired",
    run(sb) {
      const a = sb.attestation();
      const signature = sb.oracle.sign(a);
      sb.time += 16 * 60;
      sb.submit(a, signature);
    },
  },
  {
    id: "replay",
    group: "attack",
    title: "The same attestation is submitted twice",
    attempt: "After a successful verification, the identical attestation is replayed.",
    expected: "Attestation already used",
    run(sb) {
      const a = sb.attestation();
      const signature = sb.oracle.sign(a);
      sb.submit(a, signature);
      sb.submit(a, signature);
    },
  },
  {
    id: "shorten",
    group: "attack",
    title: "A status is shortened",
    attempt: "A newer attestation with an earlier validity date tries to overwrite a longer one.",
    expected: "Status would move backward",
    run(sb) {
      const long = sb.attestation({ statusValidUntil: BigInt(sb.time) + 200_000n });
      sb.submit(long, sb.oracle.sign(long));
      const short = sb.attestation({ statusValidUntil: BigInt(sb.time) + 100_000n });
      sb.submit(short, sb.oracle.sign(short));
    },
  },
  {
    id: "non-admin-revoke",
    group: "admin",
    title: "A stranger tries to revoke someone",
    attempt: "A revocation is submitted without the admin secret.",
    expected: "Not admin",
    run(sb) {
      const a = sb.attestation();
      sb.submit(a, sb.oracle.sign(a));
      sb.revoke(sb.subject, sb.time, crypto.getRandomValues(new Uint8Array(32)));
    },
  },
  {
    id: "revoke",
    group: "admin",
    title: "The admin revokes a verified person",
    attempt: "The admin revokes the subject; its status is cleared and the revocation is recorded.",
    expected: "accepted",
    run(sb) {
      const a = sb.attestation();
      sb.submit(a, sb.oracle.sign(a));
      sb.time += 60;
      sb.revoke(sb.subject, sb.time);
    },
  },
  {
    id: "resurrect",
    group: "admin",
    title: "An old attestation is used after revocation",
    attempt: "The user kept an attestation issued before they were revoked, and redeems it afterwards.",
    expected: "Issued before revocation",
    run(sb) {
      const before = sb.attestation();
      const signature = sb.oracle.sign(before);
      sb.time += 60;
      sb.revoke(sb.subject, sb.time);
      sb.submit(before, signature);
    },
  },
];

export interface ScenarioResult {
  id: string;
  /** What the contract actually did. */
  outcome: "accepted" | "refused";
  /** The contract's own assertion text when it refused. */
  message?: string;
  /** Whether that matches what the scenario says should happen. */
  asExpected: boolean;
  ledger: LedgerView;
  subject: string;
}

/** Runs one scenario on a fresh deployment and reports what the contract did. */
export function runScenario(scenario: Scenario): ScenarioResult {
  const sb = new Sandbox();
  const subject = hex(sb.subject);
  try {
    scenario.run(sb);
    return { id: scenario.id, outcome: "accepted", asExpected: scenario.expected === "accepted", ledger: sb.view(), subject };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const message = raw.replace(/^failed assert:\s*/, "");
    return { id: scenario.id, outcome: "refused", message, asExpected: message === scenario.expected, ledger: sb.view(), subject };
  }
}
