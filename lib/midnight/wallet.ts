// Server-side wallet used to deploy the contract and to submit admin and test
// transactions. Adapted from midnightntwrk/example-counter (counter-cli/src/api.ts).
// The seed is a secret: it is read from the environment and never logged.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as ledger from "@midnight-ntwrk/ledger-v8";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v8";
import { getNetworkId } from "@midnight-ntwrk/midnight-js/network-id";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js/types";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { InMemoryTransactionHistoryStorage } from "@midnight-ntwrk/wallet-sdk-abstractions";
import { mergeWalletEntries, WalletEntrySchema, WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { generateRandomSeed, HDWallet, Roles } from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import {
  createKeystore,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import * as Rx from "rxjs";
import { WebSocket } from "ws";
import type { NetworkConfig } from "./config.ts";

// GraphQL subscriptions (wallet sync) need a global WebSocket in Node.
(globalThis as { WebSocket?: unknown }).WebSocket ??= WebSocket;

export interface WalletContext {
  wallet: WalletFacade;
  /** Where sync state is persisted, so a restart resumes instead of re-syncing for hours. */
  stateFile: string;
  autosave: NodeJS.Timeout;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

export const newSeedHex = (): string => Buffer.from(generateRandomSeed()).toString("hex");

function deriveKeys(seedHex: string) {
  const hd = HDWallet.fromSeed(Buffer.from(seedHex, "hex"));
  if (hd.type !== "seedOk") throw new Error("invalid wallet seed");
  const derived = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  hd.hdWallet.clear();
  if (derived.type !== "keysDerived") throw new Error("key derivation failed");
  return derived.keys;
}

/** The address to fund from the faucet. Needs no network access. */
export function unshieldedAddressOf(seedHex: string): string {
  return createKeystore(deriveKeys(seedHex)[Roles.NightExternal], getNetworkId()).getBech32Address().toString();
}

export async function startWallet(config: NetworkConfig, seedHex: string): Promise<WalletContext> {
  const keys = deriveKeys(seedHex);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const stateFile = path.resolve(".wallet-state", `${config.networkId}-${unshieldedKeystore.getBech32Address().toString().slice(-12)}.json`);
  const saved = loadSavedState(stateFile);

  const indexerClientConnection = { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS };
  const wallet = await WalletFacade.init({
    configuration: {
      networkId: getNetworkId(),
      indexerClientConnection,
      provingServerUrl: new URL(config.proofServer),
      relayURL: new URL(config.node.replace(/^http/, "ws")),
      txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
      costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
    },
    shielded: (cfg) =>
      saved ? ShieldedWallet(cfg).restore(saved.shielded) : ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) =>
      saved
        ? UnshieldedWallet(cfg).restore(saved.unshielded)
        : UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) =>
      saved
        ? DustWallet(cfg).restore(saved.dust)
        : DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  const ctx: WalletContext = {
    wallet,
    stateFile,
    autosave: setInterval(() => void saveWalletState(ctx).catch(() => undefined), 60_000),
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
  };
  ctx.autosave.unref();
  return ctx;
}

interface SavedState {
  shielded: string;
  unshielded: string;
  dust: string;
}

function loadSavedState(file: string): SavedState | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as SavedState;
  } catch {
    return undefined; // a torn or stale file just means a full re-sync
  }
}

/** Persists sync state. The file holds wallet view data, not the seed; it is git-ignored. */
export async function saveWalletState(ctx: WalletContext): Promise<void> {
  const state: SavedState = {
    shielded: await ctx.wallet.shielded.serializeState(),
    unshielded: await ctx.wallet.unshielded.serializeState(),
    dust: await ctx.wallet.dust.serializeState(),
  };
  mkdirSync(path.dirname(ctx.stateFile), { recursive: true });
  const tmp = `${ctx.stateFile}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, ctx.stateFile);
}

export async function stopWallet(ctx: WalletContext): Promise<void> {
  clearInterval(ctx.autosave);
  await saveWalletState(ctx);
  await ctx.wallet.stop();
}

export const syncedState = (wallet: WalletFacade) =>
  Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.filter((s) => s.isSynced)));

export interface Balances {
  night: bigint;
  dust: bigint;
  nightUtxos: number;
  registeredNightUtxos: number;
}

export async function balances(wallet: WalletFacade): Promise<Balances> {
  const s = await syncedState(wallet);
  const coins = s.unshielded.availableCoins;
  return {
    night: s.unshielded.balances[unshieldedToken().raw] ?? 0n,
    dust: s.dust.balance(new Date()),
    nightUtxos: coins.length,
    registeredNightUtxos: coins.filter((c) => c.meta.registeredForDustGeneration).length,
  };
}

/** Designates unregistered NIGHT UTXOs for DUST generation. Returns how many were submitted. */
export async function registerForDust(ctx: WalletContext): Promise<number> {
  const s = await syncedState(ctx.wallet);
  const unregistered = s.unshielded.availableCoins.filter((c) => !c.meta.registeredForDustGeneration);
  if (unregistered.length === 0) return 0;
  const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(
    unregistered,
    ctx.unshieldedKeystore.getPublicKey(),
    (payload) => ctx.unshieldedKeystore.signData(payload),
  );
  await ctx.wallet.submitTransaction(await ctx.wallet.finalizeRecipe(recipe));
  return unregistered.length;
}

export const waitForDust = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((s) => s.isSynced && s.dust.balance(new Date()) > 0n),
    ),
  );

// Signs every unshielded offer with the right proof marker. The wallet SDK's
// signRecipe assumes 'pre-proof', which fails for already-proven intents.
function signIntents(
  tx: { intents?: Map<number, unknown> },
  sign: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof",
): void {
  if (!tx.intents) return;
  for (const [segment, intent] of tx.intents) {
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      "signature",
      proofMarker,
      "pre-binding",
      (intent as { serialize(): Uint8Array }).serialize(),
    );
    const signature = sign(cloned.signatureData(segment));
    const fallible = cloned.fallibleUnshieldedOffer;
    if (fallible) {
      cloned.fallibleUnshieldedOffer = fallible.addSignatures(
        fallible.inputs.map((_, i) => fallible.signatures.at(i) ?? signature),
      );
    }
    const guaranteed = cloned.guaranteedUnshieldedOffer;
    if (guaranteed) {
      cloned.guaranteedUnshieldedOffer = guaranteed.addSignatures(
        guaranteed.inputs.map((_, i) => guaranteed.signatures.at(i) ?? signature),
      );
    }
    tx.intents.set(segment, cloned);
  }
}

/** Bridges the wallet to Midnight.js: balance, sign, finalize and submit. */
export async function walletProvider(ctx: WalletContext): Promise<WalletProvider & MidnightProvider> {
  const state = await syncedState(ctx.wallet);
  const sign = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
  return {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx, ttl) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      signIntents(recipe.baseTransaction as { intents?: Map<number, unknown> }, sign, "proof");
      if (recipe.balancingTransaction) {
        signIntents(recipe.balancingTransaction as { intents?: Map<number, unknown> }, sign, "pre-proof");
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx) => ctx.wallet.submitTransaction(tx),
  };
}
