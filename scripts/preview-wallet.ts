// Creates (once) and inspects the server wallet on the configured network.
//
//   npm run wallet            address, sync, balances; registers NIGHT for DUST if funded
//   npm run wallet -- --address-only   print the funding address without syncing
//
// The seed is generated on first run and appended to .env as
// MIDNIGHT_WALLET_SEED. It is never printed.
import { existsSync } from "node:fs";
import * as Rx from "rxjs";
import { saveEnvVar } from "../lib/env-file.ts";
import { loadNetworkConfig } from "../lib/midnight/config.ts";
import {
  balances,
  newSeedHex,
  registerForDust,
  startWallet,
  stopWallet,
  unshieldedAddressOf,
  waitForDust,
} from "../lib/midnight/wallet.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const config = loadNetworkConfig();

let seed = process.env.MIDNIGHT_WALLET_SEED;
if (!seed) {
  seed = newSeedHex();
  saveEnvVar("MIDNIGHT_WALLET_SEED", seed);
  console.log("generated a new wallet seed and saved it to .env");
}

console.log(`network:            ${config.networkId}`);
console.log(`unshielded address: ${unshieldedAddressOf(seed)}`);
if (process.argv.includes("--address-only")) process.exit(0);

const started = Date.now();
const ctx = await startWallet(config, seed);

// First sync against a public network is slow; show that it is moving.
type Progress = { appliedIndex?: bigint; highestRelevantWalletIndex?: bigint; isConnected?: boolean };
const progressOf = (part: unknown): string => {
  const p = ((part as { progress?: Progress }).progress ?? (part as { state?: { progress?: Progress } }).state?.progress) as
    | Progress
    | undefined;
  return p ? `${p.appliedIndex ?? "?"}/${p.highestRelevantWalletIndex ?? "?"}${p.isConnected === false ? " (disconnected)" : ""}` : "n/a";
};
const progress = ctx.wallet
  .state()
  .pipe(Rx.throttleTime(15_000))
  .subscribe((s) => {
    if (s.isSynced) return;
    const elapsed = Math.round((Date.now() - started) / 1000);
    console.log(`  syncing ${elapsed} s: shielded ${progressOf(s.shielded)}, unshielded ${progressOf(s.unshielded)}, dust ${progressOf(s.dust)}`);
  });

let b = await balances(ctx.wallet);
progress.unsubscribe();
console.log(`synced in ${Math.round((Date.now() - started) / 1000)} s`);
console.log(`tNIGHT: ${b.night}  (UTXOs: ${b.nightUtxos}, registered for DUST: ${b.registeredNightUtxos})`);
console.log(`DUST:   ${b.dust}`);

if (b.night > 0n && b.dust === 0n) {
  const submitted = await registerForDust(ctx);
  console.log(submitted > 0 ? `registered ${submitted} UTXO(s) for DUST generation; waiting for DUST` : "waiting for DUST to accrue");
  await waitForDust(ctx.wallet);
  b = await balances(ctx.wallet);
  console.log(`DUST:   ${b.dust}`);
} else if (b.night === 0n) {
  console.log("wallet is not funded yet: send tNIGHT to the unshielded address from the faucet, then run this again");
}

await stopWallet(ctx);
process.exit(0);
