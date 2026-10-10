// Midnight.js wiring for the Profile A contract: providers, deployment, joining
// a deployed instance, and reading its public ledger state.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import type { JubjubPoint } from "@midnight-ntwrk/compact-runtime";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js/contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { Contract } from "../../contracts/managed/ciphercomply/contract/index.js";
import { witnesses, type PrivateState } from "../witnesses.ts";
import type { NetworkConfig } from "./config.ts";
import { walletProvider, type WalletContext } from "./wallet.ts";

export const PRIVATE_STATE_ID = "ciphercomplyPrivateState";
type Circuits = "verifyAndRegister" | "rotateOracleKey" | "revokeSubject";

const zkConfigPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../contracts/managed/ciphercomply");

const compiledContract = CompiledContract.make("ciphercomply", Contract<PrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

export async function configureProviders(ctx: WalletContext, config: NetworkConfig) {
  const wallet = await walletProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<Circuits>(zkConfigPath);
  const accountId = wallet.getCoinPublicKey();
  // Private state at rest is encrypted under a password derived as in the official example.
  const storagePassword = `${Buffer.from(accountId, "hex").toString("base64")}!`;
  return {
    privateStateProvider: levelPrivateStateProvider<typeof PRIVATE_STATE_ID>({
      privateStateStoreName: "ciphercomply-private-state",
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
}

export type Providers = Awaited<ReturnType<typeof configureProviders>>;

export interface DeployArgs {
  domain: Uint8Array;
  policyId: Uint8Array;
  minAssurance: bigint;
  oracleKey: JubjubPoint;
  adminHash: Uint8Array;
}

export function deploy(providers: Providers, args: DeployArgs, initialPrivateState: PrivateState) {
  return deployContract(providers, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState,
    args: [args.domain, args.policyId, args.minAssurance, args.oracleKey, args.adminHash],
  });
}

export function join(providers: Providers, contractAddress: string, initialPrivateState: PrivateState) {
  return findDeployedContract(providers, {
    contractAddress,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState,
  });
}

export type Deployed = Awaited<ReturnType<typeof deploy>>;

export { chainReader, readLedger } from "./chain-reader.ts";
