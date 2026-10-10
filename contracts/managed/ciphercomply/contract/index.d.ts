import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Attestation = { schemaVersion: bigint;
                            domain: Uint8Array;
                            policyId: Uint8Array;
                            subject: Uint8Array;
                            eligible: boolean;
                            assuranceLevel: bigint;
                            amountMinorUnits: bigint;
                            currency: Uint8Array;
                            issuedAt: bigint;
                            expiresAt: bigint;
                            statusValidUntil: bigint;
                            nonce: Uint8Array;
                            documentHash: Uint8Array
                          };

export type OracleSignature = { announcement: __compactRuntime.JubjubPoint;
                                response: bigint
                              };

export type Witnesses<PS> = {
  userSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  adminSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  attestation(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Attestation];
  oracleSignature(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, OracleSignature];
}

export type ImpureCircuits<PS> = {
  verifyAndRegister(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  rotateOracleKey(context: __compactRuntime.CircuitContext<PS>,
                  newKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  revokeSubject(context: __compactRuntime.CircuitContext<PS>,
                subject_0: Uint8Array,
                atTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  verifyAndRegister(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  rotateOracleKey(context: __compactRuntime.CircuitContext<PS>,
                  newKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  revokeSubject(context: __compactRuntime.CircuitContext<PS>,
                subject_0: Uint8Array,
                atTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  ownerScalarOf(secretKey_0: Uint8Array): bigint;
  ownerKeyOf(secretKey_0: Uint8Array): __compactRuntime.JubjubPoint;
  subjectFor(contractAddress_0: Uint8Array,
             ownerKey_0: __compactRuntime.JubjubPoint): Uint8Array;
  ownershipChallenge(domain_0: Uint8Array,
                     policy_0: Uint8Array,
                     serverNonce_0: Uint8Array,
                     subject_0: Uint8Array): Uint8Array;
  nullifierFor(contractAddress_0: Uint8Array, nonce_0: Uint8Array): Uint8Array;
  adminHashOf(sk_0: Uint8Array): Uint8Array;
  attestationDigest(a_0: Attestation): Uint8Array;
  schnorrChallenge(announcement_0: __compactRuntime.JubjubPoint,
                   publicKey_0: __compactRuntime.JubjubPoint,
                   digest_0: Uint8Array): bigint;
  schnorrPublicKey(secretScalar_0: bigint): __compactRuntime.JubjubPoint;
  schnorrVerify(publicKey_0: __compactRuntime.JubjubPoint,
                digest_0: Uint8Array,
                sig_0: OracleSignature): boolean;
  isUsableOracleKey(publicKey_0: __compactRuntime.JubjubPoint): boolean;
}

export type Circuits<PS> = {
  ownerScalarOf(context: __compactRuntime.CircuitContext<PS>,
                secretKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  ownerKeyOf(context: __compactRuntime.CircuitContext<PS>,
             secretKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, __compactRuntime.JubjubPoint>;
  subjectFor(context: __compactRuntime.CircuitContext<PS>,
             contractAddress_0: Uint8Array,
             ownerKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  ownershipChallenge(context: __compactRuntime.CircuitContext<PS>,
                     domain_0: Uint8Array,
                     policy_0: Uint8Array,
                     serverNonce_0: Uint8Array,
                     subject_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  nullifierFor(context: __compactRuntime.CircuitContext<PS>,
               contractAddress_0: Uint8Array,
               nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  adminHashOf(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  attestationDigest(context: __compactRuntime.CircuitContext<PS>,
                    a_0: Attestation): __compactRuntime.CircuitResults<PS, Uint8Array>;
  schnorrChallenge(context: __compactRuntime.CircuitContext<PS>,
                   announcement_0: __compactRuntime.JubjubPoint,
                   publicKey_0: __compactRuntime.JubjubPoint,
                   digest_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  schnorrPublicKey(context: __compactRuntime.CircuitContext<PS>,
                   secretScalar_0: bigint): __compactRuntime.CircuitResults<PS, __compactRuntime.JubjubPoint>;
  schnorrVerify(context: __compactRuntime.CircuitContext<PS>,
                publicKey_0: __compactRuntime.JubjubPoint,
                digest_0: Uint8Array,
                sig_0: OracleSignature): __compactRuntime.CircuitResults<PS, boolean>;
  isUsableOracleKey(context: __compactRuntime.CircuitContext<PS>,
                    publicKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, boolean>;
  verifyAndRegister(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  rotateOracleKey(context: __compactRuntime.CircuitContext<PS>,
                  newKey_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  revokeSubject(context: __compactRuntime.CircuitContext<PS>,
                subject_0: Uint8Array,
                atTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly domainTag: Uint8Array;
  readonly policyId: Uint8Array;
  readonly minAssurance: bigint;
  readonly oraclePublicKey: __compactRuntime.JubjubPoint;
  readonly oracleKeyId: bigint;
  readonly adminHash: Uint8Array;
  verifiedUntil: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  revokedAt: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               domain__0: Uint8Array,
               policy__0: Uint8Array,
               minAssurance__0: bigint,
               oracleKey__0: __compactRuntime.JubjubPoint,
               adminHash__0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
