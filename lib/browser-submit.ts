// Browser-side proving and submission of an issued attestation through a
// DApp-connector wallet (Lace). Uses only Web APIs. The wiring follows the
// official midnightntwrk/example-bboard browser integration.
//
// The attestation and the user secret are private witness data: they are held
// in memory for the duration of the call and never stored or logged here.
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Transaction, type Binding, type Proof, type SignatureEnabled } from "@midnight-ntwrk/ledger-v8";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js/contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js/network-id";
import {
  createProofProvider,
  type PrivateStateId,
  type PrivateStateProvider,
  type ProofProvider,
} from "@midnight-ntwrk/midnight-js/types";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { Contract, type Attestation, type OracleSignature } from "../contracts/managed/ciphercomply/contract/index.js";
import { hex, unhex } from "./client-ownership.ts";
import { witnesses, type PrivateState } from "./witnesses.ts";

const PRIVATE_STATE_ID = "ciphercomplyPrivateState";
type Circuits = "verifyAndRegister" | "rotateOracleKey" | "revokeSubject";

/** The connector API major version this code was written against. */
const CONNECTOR_MAJOR = "4";

export type WalletErrorCode = "no_wallet" | "wallet_rejected" | "wallet_wrong_network" | "wallet_disconnected" | "wallet_error";

export class WalletError extends Error {
  /**
   * @param stage which wallet call failed.
   * @param detail the wallet's own error code and reason. Wallet-authored text: show it as text only.
   */
  constructor(
    readonly code: WalletErrorCode,
    readonly stage?: string,
    readonly detail?: string,
  ) {
    super(code);
  }
}

// Midnight.js wraps errors thrown inside its providers, so the last wallet
// failure is also kept here for the caller to read back.
let lastWalletError: WalletError | undefined;
export const takeLastWalletError = (): WalletError | undefined => {
  const e = lastWalletError;
  lastWalletError = undefined;
  return e;
};

/** The first injected wallet that speaks a compatible connector API, if any. */
export function findWallet(): InitialAPI | undefined {
  const injected = (globalThis as { midnight?: Record<string, InitialAPI> }).midnight;
  if (!injected) return undefined;
  return Object.values(injected).find(
    (w) => !!w && typeof w === "object" && typeof w.apiVersion === "string" && w.apiVersion.split(".")[0] === CONNECTOR_MAJOR,
  );
}

function toWalletError(e: unknown, stage: string): WalletError {
  if (e instanceof WalletError) return e;
  const api = e as { type?: string; code?: string; reason?: string; message?: string };
  const code = api.type === "DAppConnectorAPIError" ? api.code : undefined;
  const detail = [code, api.reason ?? api.message].filter(Boolean).join(": ").slice(0, 300) || undefined;
  const kind: WalletErrorCode =
    code === "Rejected" || code === "PermissionRejected"
      ? "wallet_rejected"
      : code === "Disconnected"
        ? "wallet_disconnected"
        : "wallet_error";
  lastWalletError = new WalletError(kind, stage, detail);
  return lastWalletError;
}

/** Asks the wallet to connect on the given network. The wallet may prompt the user. */
export async function connectWallet(network: string): Promise<ConnectedAPI> {
  const wallet = findWallet();
  if (!wallet) throw new WalletError("no_wallet");
  try {
    const api = await wallet.connect(network);
    const status = await api.getConnectionStatus();
    if (status.status !== "connected") throw new WalletError("wallet_disconnected");
    if (status.networkId !== network) throw new WalletError("wallet_wrong_network");
    return api;
  } catch (e) {
    throw toWalletError(e, "connect");
  }
}

/** Private state held in memory only: nothing about the attestation is written to browser storage here. */
function inMemoryPrivateStateProvider<PS>(): PrivateStateProvider<PrivateStateId, PS> {
  const states = new Map<string, PS>();
  const signingKeys = new Map<string, string>();
  let address: string | null = null;
  const scoped = (id: string) => {
    if (address === null) throw new Error("contract address not set");
    return `${address}:${id}`;
  };
  const unsupported = () => Promise.reject(new Error("not supported by the in-memory private state provider"));
  return {
    setContractAddress: (a) => {
      address = a;
    },
    set: async (id, state) => {
      states.set(scoped(id), state);
    },
    get: async (id) => states.get(scoped(id)) ?? null,
    remove: async (id) => {
      states.delete(scoped(id));
    },
    clear: async () => states.clear(),
    setSigningKey: async (a, key) => {
      signingKeys.set(a, key);
    },
    getSigningKey: async (a) => signingKeys.get(a) ?? null,
    removeSigningKey: async (a) => {
      signingKeys.delete(a);
    },
    clearSigningKeys: async () => signingKeys.clear(),
    exportPrivateStates: unsupported,
    importPrivateStates: unsupported,
    exportSigningKeys: unsupported,
    importSigningKeys: unsupported,
  };
}

/** Rebuilds the witness values from the attestation as the API returned it. */
export function parseIssuedAttestation(o: Record<string, string | number | boolean>): {
  attestation: Attestation;
  signature: OracleSignature;
} {
  const bytes = (k: string) => unhex(String(o[k]));
  const sig = bytes("signatureHex");
  if (sig.length !== 96) throw new Error("malformed signature");
  const big = (b: Uint8Array) => BigInt(`0x${hex(b)}`);
  return {
    attestation: {
      schemaVersion: BigInt(o.schemaVersion as number),
      domain: bytes("domain"),
      policyId: bytes("policyId"),
      subject: bytes("subject"),
      eligible: o.eligible === true,
      assuranceLevel: BigInt(o.assuranceLevel as number),
      amountMinorUnits: BigInt(String(o.amountMinorUnits)),
      currency: new TextEncoder().encode(String(o.currency)),
      issuedAt: BigInt(String(o.issuedAt)),
      expiresAt: BigInt(String(o.expiresAt)),
      statusValidUntil: BigInt(String(o.statusValidUntil)),
      nonce: bytes("nonce"),
      documentHash: bytes("documentHash"),
    },
    signature: {
      announcement: { x: big(sig.subarray(0, 32)), y: big(sig.subarray(32, 64)) },
      response: big(sig.subarray(64, 96)),
    },
  };
}

export interface SubmitOptions {
  network: string;
  contractAddress: string;
  /** Base URL serving `keys/<circuit>.prover|.verifier` and `zkir/<circuit>.bzkir`. */
  zkArtifactsUrl: string;
  userSecret: Uint8Array;
  issued: Record<string, string | number | boolean>;
}

export interface SubmitEvents {
  /** Proof generation has started. */
  onProving(): void;
  /** The proof exists; the wallet is balancing, signing and submitting. */
  onSubmitting(): void;
}

export interface SubmitResult {
  txId: string;
  /** What block explorers index transactions by. */
  txHash: string;
  blockHeight: number;
}

/**
 * Proves verifyAndRegister for the attestation and submits it through the
 * wallet. Resolves once Midnight.js has seen the transaction finalized.
 * @throws WalletError for wallet-side failures; other errors (including the
 *   contract's own assertion failures) propagate unchanged.
 */
export async function submitAttestation(api: ConnectedAPI, options: SubmitOptions, events: SubmitEvents): Promise<SubmitResult> {
  setNetworkId(options.network);
  const walletConfig = await api.getConfiguration();
  if (walletConfig.networkId !== options.network) throw new WalletError("wallet_wrong_network");
  const shielded = await api.getShieldedAddresses();

  const zkConfigProvider = new FetchZkConfigProvider<Circuits>(options.zkArtifactsUrl, fetch.bind(globalThis));
  // Prefer the wallet's own prover; fall back to the proof server it is configured with.
  let prover: ProofProvider;
  if (walletConfig.proverServerUri) {
    prover = httpClientProofProvider(walletConfig.proverServerUri, zkConfigProvider);
  } else {
    prover = createProofProvider(
      await api.getProvingProvider({
        getZKIR: (location: string) => zkConfigProvider.getZKIR(location as Circuits),
        getProverKey: (location: string) => zkConfigProvider.getProverKey(location as Circuits),
        getVerifierKey: (location: string) => zkConfigProvider.getVerifierKey(location as Circuits),
      }),
    );
  }

  const providers = {
    privateStateProvider: inMemoryPrivateStateProvider<PrivateState>(),
    publicDataProvider: indexerPublicDataProvider(walletConfig.indexerUri, walletConfig.indexerWsUri),
    zkConfigProvider,
    proofProvider: {
      proveTx: (tx, config) => {
        events.onProving();
        return prover.proveTx(tx, config);
      },
    } satisfies ProofProvider,
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (tx: { serialize(): Uint8Array }) => {
        events.onSubmitting();
        try {
          const balanced = await api.balanceUnsealedTransaction(hex(tx.serialize()));
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>("signature", "proof", "binding", unhex(balanced.tx));
        } catch (e) {
          throw toWalletError(e, "balance");
        }
      },
    },
    midnightProvider: {
      submitTx: async (tx: { serialize(): Uint8Array; identifiers(): string[] }) => {
        try {
          await api.submitTransaction(hex(tx.serialize()));
        } catch (e) {
          throw toWalletError(e, "submit");
        }
        const id = tx.identifiers()[0];
        if (id === undefined) throw new Error("transaction has no identifier");
        return id;
      },
    },
  };

  const { attestation, signature } = parseIssuedAttestation(options.issued);
  const privateState: PrivateState = {
    userSecretKey: options.userSecret,
    adminSecretKey: new Uint8Array(32),
    attestation,
    signature,
  };
  const compiledContract = CompiledContract.make("ciphercomply", Contract<PrivateState>).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(options.zkArtifactsUrl),
  );
  const contract = await findDeployedContract(providers, {
    contractAddress: options.contractAddress,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: privateState,
  });
  const tx = await contract.callTx.verifyAndRegister();
  return { txId: tx.public.txId, txHash: tx.public.txHash, blockHeight: tx.public.blockHeight };
}
