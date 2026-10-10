// Sends test NIGHT from the server wallet to an unshielded address on the
// configured network. Test networks only.
//
//   npm run send -- <mn_addr_...> <whole tNIGHT>
import { existsSync } from "node:fs";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v8";
import { getNetworkId } from "@midnight-ntwrk/midnight-js/network-id";
import { MidnightBech32m, UnshieldedAddress } from "@midnight-ntwrk/wallet-sdk-address-format";
import { loadNetworkConfig } from "../lib/midnight/config.ts";
import { balances, startWallet, stopWallet } from "../lib/midnight/wallet.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const config = loadNetworkConfig();
if (config.networkId !== "preview" && config.networkId !== "preprod") throw new Error("test networks only");

const [to, amountText] = process.argv.slice(2);
if (!to || !amountText || !/^\d+$/.test(amountText)) throw new Error("usage: npm run send -- <mn_addr_...> <whole tNIGHT>");
if (!to.startsWith("mn_addr_")) {
  throw new Error("that is not an unshielded address (mn_addr_...). tNIGHT is an unshielded token and cannot be sent to a shielded address.");
}
const receiverAddress = MidnightBech32m.parse(to).decode(UnshieldedAddress, getNetworkId());
const amount = BigInt(amountText) * 1_000_000n; // the faucet's 5,000 tNIGHT arrived as 5000000000 units

const seed = process.env.MIDNIGHT_WALLET_SEED;
if (!seed) throw new Error("missing environment variable MIDNIGHT_WALLET_SEED");
const ctx = await startWallet(config, seed);
const before = await balances(ctx.wallet);
console.log(`server wallet: tNIGHT ${before.night}, DUST ${before.dust}`);
if (before.night < amount) throw new Error("not enough tNIGHT in the server wallet");

const recipe = await ctx.wallet.transferTransaction(
  [{ type: "unshielded", outputs: [{ type: unshieldedToken().raw, receiverAddress, amount }] }],
  { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
  { ttl: new Date(Date.now() + 30 * 60 * 1000) },
);
const signed = await ctx.wallet.signRecipe(recipe, (payload) => ctx.unshieldedKeystore.signData(payload));
const txId = await ctx.wallet.submitTransaction(await ctx.wallet.finalizeRecipe(signed));
console.log(`sent ${amountText} tNIGHT to ${to}`);
console.log(`transaction: ${txId}`);

await stopWallet(ctx);
process.exit(0);
