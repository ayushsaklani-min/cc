// Simulator harness: runs the compiled contract's own JavaScript against the
// on-chain runtime VM, with a controllable block time. This exercises the real
// compiled circuit logic and ledger transcript, but it does NOT generate or
// verify a zero-knowledge proof and does not touch a network.
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
  type Ledger,
  type OracleSignature,
} from "../contracts/managed/ciphercomply/contract/index.js";
import {
  generateSecretScalar,
  issueAttestation,
  localSchnorrSigner,
  type LocalOracleSigner,
} from "../lib/oracle-signer.ts";
import { witnesses, type PrivateState } from "../lib/witnesses.ts";

export type { PrivateState };

export const bytes = (length: number, fill: number): Uint8Array => new Uint8Array(length).fill(fill);

export const text32 = (s: string): Uint8Array => {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(s));
  return out;
};

const COIN_PUBLIC_KEY = "0".repeat(64);

export const T0 = 1_800_000_000; // arbitrary fixed "now" in chain seconds

export interface WorldOptions {
  minAssurance?: bigint;
  oracleKey?: JubjubPoint;
}

export class World {
  readonly contract = new Contract<PrivateState>(witnesses);
  readonly address = sampleContractAddress();
  readonly addressBytes = encodeContractAddress(this.address);
  readonly domain = text32("cc:test-domain");
  readonly policyId = text32("cc:policy:income-v1");
  readonly adminSecret = bytes(32, 0xad);
  readonly userSecret = bytes(32, 0x11);
  readonly oracle: LocalOracleSigner = localSchnorrSigner(generateSecretScalar());
  time = T0;
  private nonceCounter = 0;
  private ctx: CircuitContext<PrivateState>;

  constructor(opts: WorldOptions = {}) {
    const ps: PrivateState = {
      userSecretKey: this.userSecret,
      adminSecretKey: this.adminSecret,
      attestation: undefined,
      signature: undefined,
    };
    const init = this.contract.initialState(
      createConstructorContext(ps, COIN_PUBLIC_KEY),
      this.domain,
      this.policyId,
      opts.minAssurance ?? 2n,
      opts.oracleKey ?? this.oracle.publicKey,
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

  get subject(): Uint8Array {
    return this.subjectOf(this.userSecret);
  }

  subjectOf(secret: Uint8Array): Uint8Array {
    return pureCircuits.subjectFor(this.addressBytes, pureCircuits.ownerKeyOf(secret));
  }

  nullifierOf(nonce: Uint8Array): Uint8Array {
    return pureCircuits.nullifierFor(this.addressBytes, nonce);
  }

  get ledger(): Ledger {
    return ledger(this.ctx.currentQueryContext.state);
  }

  /** A well-formed, currently valid attestation for the default user. */
  attestation(overrides: Partial<Attestation> = {}): Attestation {
    const now = BigInt(this.time);
    this.nonceCounter += 1;
    return {
      schemaVersion: 1n,
      domain: this.domain,
      policyId: this.policyId,
      subject: this.subject,
      eligible: true,
      assuranceLevel: 2n,
      amountMinorUnits: 8_500_000n,
      currency: new TextEncoder().encode("USD"),
      issuedAt: now,
      expiresAt: now + 900n,
      statusValidUntil: now + 86_400n,
      nonce: bytes(32, this.nonceCounter),
      documentHash: bytes(32, 0xd0),
      ...overrides,
    };
  }

  /** Signs with the oracle key directly, bypassing issuance policy, for adversarial cases. */
  signSync(a: Attestation, signer: LocalOracleSigner = this.oracle): OracleSignature {
    return signer.signSync(pureCircuits.attestationDigest(a));
  }

  async issue(overrides: Partial<Attestation> = {}) {
    return issueAttestation(this.oracle, this.attestation(overrides));
  }

  private context(ps: Partial<PrivateState>): CircuitContext<PrivateState> {
    // Rebuilt for every call so each "transaction" sees the current block time.
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

  /** Submits verifyAndRegister. Throws (and leaves state untouched) if the circuit aborts. */
  submit(a: Attestation, signature: OracleSignature, userSecretKey = this.userSecret) {
    const r = this.contract.impureCircuits.verifyAndRegister(
      this.context({ attestation: a, signature, userSecretKey }),
    );
    this.ctx = r.context;
    return r;
  }

  rotate(newKey: JubjubPoint, adminSecretKey = this.adminSecret) {
    const r = this.contract.impureCircuits.rotateOracleKey(this.context({ adminSecretKey }), newKey);
    this.ctx = r.context;
    return r;
  }

  revoke(subject: Uint8Array, atTime: bigint, adminSecretKey = this.adminSecret) {
    const r = this.contract.impureCircuits.revokeSubject(
      this.context({ adminSecretKey }),
      subject,
      atTime,
    );
    this.ctx = r.context;
    return r;
  }
}
