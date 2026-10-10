// Witness implementations for the Profile A contract. Private state holds the
// secrets and the attestation being redeemed; it never leaves the caller.
import type { Attestation, OracleSignature, Witnesses } from "../contracts/managed/ciphercomply/contract/index.js";

export interface PrivateState {
  userSecretKey: Uint8Array;
  adminSecretKey: Uint8Array;
  attestation: Attestation | undefined;
  signature: OracleSignature | undefined;
}

const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`witness ${what} not provided`);
  return v;
};

export const witnesses: Witnesses<PrivateState> = {
  userSecretKey: ({ privateState }) => [privateState, privateState.userSecretKey],
  adminSecretKey: ({ privateState }) => [privateState, privateState.adminSecretKey],
  attestation: ({ privateState }) => [privateState, need(privateState.attestation, "attestation")],
  oracleSignature: ({ privateState }) => [privateState, need(privateState.signature, "signature")],
};
