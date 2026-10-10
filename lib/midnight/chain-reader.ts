// Read-only view of the contract's public ledger through the indexer. Kept
// separate from contract.ts so the web server does not load the wallet, the
// proof client or the local private-state database.
import type { PublicDataProvider } from "@midnight-ntwrk/midnight-js/types";
import { ledger, type Ledger } from "../../contracts/managed/ciphercomply/contract/index.js";
import type { ChainReader } from "../gateway.ts";

type Reader = { publicDataProvider: Pick<PublicDataProvider, "queryContractState"> };

/** The contract's public ledger as currently indexed, or undefined if nothing is deployed there. */
export async function readLedger(providers: Reader, contractAddress: string): Promise<Ledger | undefined> {
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  return state == null ? undefined : ledger(state.data);
}

/** Gateway view of the chain: only finalized, indexed state. */
export function chainReader(providers: Reader, contractAddress: string): ChainReader {
  const lookup = async (pick: (l: Ledger) => Ledger["revokedAt"], subject: Uint8Array) => {
    const l = await readLedger(providers, contractAddress);
    if (l === undefined) throw new Error("contract state unavailable");
    const map = pick(l);
    return map.member(subject) ? map.lookup(subject) : undefined;
  };
  return {
    revokedAt: (subject) => lookup((l) => l.revokedAt, subject),
    verifiedUntil: (subject) => lookup((l) => l.verifiedUntil, subject),
  };
}
