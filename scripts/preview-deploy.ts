// Deploys Profile A to the configured network and records the address in .env.
//
//   npm run deploy            the default (income) policy
//   npm run deploy -- --age   the signed-record "over 18" policy, as its own contract
//
// Development keys only: the oracle scalar and the admin secret are generated
// locally and stored in .env. Production custody is a separate design.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { pureCircuits } from "../contracts/managed/ciphercomply/contract/index.js";
import { text32 } from "../lib/encoding.ts";
import { saveEnvVar } from "../lib/env-file.ts";
import { loadNetworkConfig } from "../lib/midnight/config.ts";
import { configureProviders, deploy } from "../lib/midnight/contract.ts";
import { balances, startWallet, stopWallet } from "../lib/midnight/wallet.ts";
import { generateSecretScalar, publicKeyOf } from "../lib/oracle-signer.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const config = loadNetworkConfig();

const env = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`missing environment variable ${name}`);
  return v;
};
/** Reads a secret from the environment, generating and saving it on first use. Never printed. */
const secret = (name: string, make: () => string): string => {
  const existing = process.env[name];
  if (existing) return existing;
  const value = make();
  saveEnvVar(name, value);
  console.log(`generated ${name} and saved it to .env`);
  return value;
};

// Each policy is sealed into its own contract instance, with the same oracle and admin keys.
const target = process.argv.includes("--age")
  ? { policyId: "age-over-18:v1", addressVar: "CIPHERCOMPLY_AGE_CONTRACT_ADDRESS" }
  : { policyId: env("CIPHERCOMPLY_POLICY_ID"), addressVar: "CIPHERCOMPLY_CONTRACT_ADDRESS" };
if (process.env[target.addressVar]) {
  throw new Error(`${target.addressVar} is already set; remove it from .env to deploy a new instance`);
}
console.log(`deploying policy ${target.policyId}`);

const oracleScalar = BigInt(secret("ORACLE_DEV_SECRET_SCALAR", () => generateSecretScalar().toString()));
const adminSecret = Buffer.from(secret("ADMIN_DEV_SECRET_HEX", () => randomBytes(32).toString("hex")), "hex");

const ctx = await startWallet(config, env("MIDNIGHT_WALLET_SEED"));
const b = await balances(ctx.wallet);
console.log(`wallet synced: tNIGHT ${b.night}, DUST ${b.dust}`);
if (b.dust === 0n) throw new Error("no DUST available for fees: run `npm run wallet` after funding");

const providers = await configureProviders(ctx, config);
const started = Date.now();
const deployed = await deploy(
  providers,
  {
    domain: text32(env("CIPHERCOMPLY_DOMAIN")),
    policyId: text32(target.policyId),
    minAssurance: BigInt(env("CIPHERCOMPLY_MIN_ASSURANCE")),
    oracleKey: publicKeyOf(oracleScalar),
    adminHash: pureCircuits.adminHashOf(new Uint8Array(adminSecret)),
  },
  { userSecretKey: new Uint8Array(32), adminSecretKey: new Uint8Array(adminSecret), attestation: undefined, signature: undefined },
);

const { contractAddress, txId, blockHeight } = deployed.deployTxData.public;
saveEnvVar(target.addressVar, contractAddress);
console.log(`deployed in ${Math.round((Date.now() - started) / 1000)} s`);
console.log(`contract address: ${contractAddress}`);
console.log(`deploy tx:        ${txId} (block ${blockHeight})`);

await stopWallet(ctx);
process.exit(0);
