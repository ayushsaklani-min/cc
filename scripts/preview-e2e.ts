// End-to-end settlement test against the deployed contract on the configured
// network: real proofs, real transactions, state read back from the indexer.
//
//   npm run e2e
//
// Cases: (1) a valid attestation settles and registers the subject,
// (2) replaying it is rejected, (3) an attestation already expired by chain
// time is rejected. Exits non-zero if any case does not behave as expected.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits, type Attestation } from "../contracts/managed/ciphercomply/contract/index.js";
import { text32, toHex } from "../lib/encoding.ts";
import { loadNetworkConfig } from "../lib/midnight/config.ts";
import { configureProviders, join, PRIVATE_STATE_ID, readLedger } from "../lib/midnight/contract.ts";
import { startWallet, stopWallet } from "../lib/midnight/wallet.ts";
import { issueAttestation, localSchnorrSigner } from "../lib/oracle-signer.ts";
import type { PrivateState } from "../lib/witnesses.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const config = loadNetworkConfig();
const env = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`missing environment variable ${name}`);
  return v;
};

const contractAddress = env("CIPHERCOMPLY_CONTRACT_ADDRESS");
const addressBytes = encodeContractAddress(contractAddress);
const oracle = localSchnorrSigner(BigInt(env("ORACLE_DEV_SECRET_SCALAR")));
const adminSecretKey = new Uint8Array(Buffer.from(env("ADMIN_DEV_SECRET_HEX"), "hex"));
const userSecretKey = new Uint8Array(randomBytes(32)); // a fresh test user per run
const subject = pureCircuits.subjectFor(addressBytes, pureCircuits.ownerKeyOf(userSecretKey));

const ctx = await startWallet(config, env("MIDNIGHT_WALLET_SEED"));
const providers = await configureProviders(ctx, config);
const base: PrivateState = { userSecretKey, adminSecretKey, attestation: undefined, signature: undefined };
const contract = await join(providers, contractAddress, base);

const attestation = (issuedAt: number, expiresAt: number): Attestation => ({
  schemaVersion: 1n,
  domain: text32(env("CIPHERCOMPLY_DOMAIN")),
  policyId: text32(env("CIPHERCOMPLY_POLICY_ID")),
  subject,
  eligible: true,
  assuranceLevel: BigInt(env("CIPHERCOMPLY_MIN_ASSURANCE")),
  amountMinorUnits: 9_000_000n,
  currency: new TextEncoder().encode("USD"),
  issuedAt: BigInt(issuedAt),
  expiresAt: BigInt(expiresAt),
  statusValidUntil: BigInt(expiresAt + 86_400),
  nonce: new Uint8Array(randomBytes(32)),
  documentHash: new Uint8Array(randomBytes(32)),
});

async function submit(a: Attestation): Promise<{ ok: true; txId: string; blockHeight: number; seconds: number } | { ok: false; error: string }> {
  const issued = await issueAttestation(oracle, a);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, { ...base, attestation: issued.attestation, signature: issued.signature });
  const started = Date.now();
  try {
    const tx = await contract.callTx.verifyAndRegister();
    return { ok: true, txId: tx.public.txId, blockHeight: tx.public.blockHeight, seconds: Math.round((Date.now() - started) / 1000) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.split("\n")[0] ?? "" : String(e) };
  }
}

let failures = 0;
const check = (name: string, pass: boolean, detail: string) => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}: ${detail}`);
  if (!pass) failures += 1;
};

const now = Math.floor(Date.now() / 1000);
console.log(`contract ${contractAddress}\nsubject  ${toHex(subject)}`);

// 1. Happy path.
const valid = attestation(now - 60, now + 900);
const first = await submit(valid);
check("valid attestation settles", first.ok, first.ok ? `tx ${first.txId} in block ${first.blockHeight}, ${first.seconds} s` : first.error);
if (first.ok) {
  const l = await readLedger(providers, contractAddress);
  const registered = l !== undefined && l.verifiedUntil.member(subject) && l.verifiedUntil.lookup(subject) === valid.statusValidUntil;
  const consumed = l !== undefined && l.usedNullifiers.member(pureCircuits.nullifierFor(addressBytes, valid.nonce));
  check("indexed ledger shows the subject and the nullifier", registered && consumed, `verifiedUntil=${registered}, nullifier=${consumed}`);
}

// 2. Replay. A fresh signature over the same attestation carries the same nonce.
const replay = await submit(valid);
// Only the contract's own assertion counts as a rejection; any other error is a test failure.
check(
  "replay is rejected by the contract",
  !replay.ok && replay.error.includes("Attestation already used"),
  replay.ok ? `unexpectedly settled in tx ${replay.txId}` : replay.error,
);

// 3. Expired by chain time.
const expired = await submit(attestation(now - 2000, now - 1000));
check(
  "expired attestation is rejected by the contract",
  !expired.ok && expired.error.includes("Attestation expired"),
  expired.ok ? `unexpectedly settled in tx ${expired.txId}` : expired.error,
);

await stopWallet(ctx);
process.exit(failures === 0 ? 0 : 1);
