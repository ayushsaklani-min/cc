// Re-checks the recorded evidence against the public Midnight indexer.
// Needs no wallet, no secrets and no .env: everything it reads is public.
//
//   npm run verify:onchain                      compare the chain with every evidence file
//   npx tsx scripts/verify-onchain.ts <file>     one evidence file (default evidence/onchain.json)
//   npx tsx scripts/verify-onchain.ts <file> --record   rewrite its ledger snapshot from the chain
//
// The transactions in the evidence file were produced by the runs described in
// SPIKE-REPORT.md. Recording refreshes only what the chain itself reports for
// them (hash, block, action) and the ledger snapshot; it never invents entries.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js/network-id";
import { WebSocket } from "ws";
import { text32, toHex } from "../lib/encoding.ts";
import { readLedger } from "../lib/midnight/chain-reader.ts";

interface RecordedTx {
  label: string;
  /** Midnight.js transaction identifier, or the transaction hash. One of the two is set. */
  identifier?: string;
  hash?: string;
  block?: number;
  action?: string;
}

interface Evidence {
  network: string;
  indexerUrl: string;
  indexerWsUrl: string;
  contractAddress: string;
  domain: string;
  policyId: string;
  minAssurance: number;
  transactions: RecordedTx[];
  ledger?: {
    recordedAt: string;
    oracleKeyId: string;
    oraclePublicKey: { x: string; y: string };
    adminHash: string;
    verified: { subject: string; validUntil: string }[];
    revoked: { subject: string; epoch: string }[];
    usedNullifiers: number;
  };
}

const named = process.argv.slice(2).find((a) => a.endsWith(".json"));
const file = named ? pathToFileURL(resolve(named)) : new URL("../evidence/onchain.json", import.meta.url);
const evidence = JSON.parse(readFileSync(file, "utf8")) as Evidence;
const record = process.argv.includes("--record");
const indexerUrl = process.env.MIDNIGHT_INDEXER_URL || evidence.indexerUrl;
const indexerWsUrl = process.env.MIDNIGHT_INDEXER_WS_URL || evidence.indexerWsUrl;

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

interface IndexedTx {
  hash: string;
  block: { height: number };
  contractActions: { __typename: string; address: string }[];
}

async function findTransaction(tx: RecordedTx): Promise<IndexedTx | undefined> {
  const offset = tx.identifier ? `identifier:"${tx.identifier}"` : `hash:"${tx.hash}"`;
  const res = await fetch(indexerUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{ transactions(offset:{${offset}}){ hash block{height} contractActions{ __typename address } } }`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json()) as { data?: { transactions?: IndexedTx[] } };
  return body.data?.transactions?.[0];
}

setNetworkId(evidence.network);
(globalThis as { WebSocket?: unknown }).WebSocket ??= WebSocket;
const publicDataProvider = indexerPublicDataProvider(indexerUrl, indexerWsUrl);

console.log(`contract ${evidence.contractAddress} on ${evidence.network}, via ${indexerUrl}\n`);

// 1. Transactions: each exists, in the recorded block, acting on this contract.
for (const tx of evidence.transactions) {
  const found = await findTransaction(tx);
  if (record) {
    if (!found) throw new Error(`cannot record: transaction not found for "${tx.label}"`);
    tx.hash = found.hash;
    tx.block = found.block.height;
    const action = found.contractActions.find((a) => a.address === evidence.contractAddress)?.__typename;
    if (action === undefined) throw new Error(`cannot record: "${tx.label}" does not act on this contract`);
    tx.action = action;
    continue;
  }
  check(`${tx.label}: transaction is indexed`, found !== undefined, tx.hash ?? tx.identifier);
  if (!found) continue;
  check(`${tx.label}: hash`, found.hash === tx.hash, found.hash);
  check(`${tx.label}: block`, found.block.height === tx.block, `block ${found.block.height}`);
  const action = found.contractActions.find((a) => a.address === evidence.contractAddress);
  check(`${tx.label}: acts on this contract`, action !== undefined);
  check(`${tx.label}: action is ${tx.action}`, action?.__typename === tx.action, action?.__typename);
}

// 2. The contract's public ledger.
const ledger = await readLedger({ publicDataProvider }, evidence.contractAddress);
if (ledger === undefined) {
  check("contract state is indexed", false);
} else if (record) {
  evidence.ledger = {
    recordedAt: new Date().toISOString(),
    oracleKeyId: ledger.oracleKeyId.toString(),
    oraclePublicKey: { x: ledger.oraclePublicKey.x.toString(16), y: ledger.oraclePublicKey.y.toString(16) },
    adminHash: toHex(ledger.adminHash),
    verified: [...ledger.verifiedUntil].map(([s, until]) => ({ subject: toHex(s), validUntil: until.toString() })),
    revoked: [...ledger.revokedAt].map(([s, epoch]) => ({ subject: toHex(s), epoch: epoch.toString() })),
    usedNullifiers: Number(ledger.usedNullifiers.size()),
  };
  writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`recorded ${evidence.transactions.length} transactions and the ledger snapshot to ${named ?? "evidence/onchain.json"}`);
} else {
  check("contract state is indexed", true);
  // Sealed at deployment: these can never change.
  check("ledger: domain tag", toHex(ledger.domainTag) === toHex(text32(evidence.domain)), evidence.domain);
  check("ledger: policy id", toHex(ledger.policyId) === toHex(text32(evidence.policyId)), evidence.policyId);
  check("ledger: minimum assurance", ledger.minAssurance === BigInt(evidence.minAssurance), ledger.minAssurance.toString());

  const snapshot = evidence.ledger;
  if (!snapshot) {
    check("evidence has a ledger snapshot", false, "run with --record first");
  } else {
    check("ledger: admin hash", toHex(ledger.adminHash) === snapshot.adminHash);
    // The oracle key may be rotated; the key id only ever increases.
    check("ledger: oracle key id has not gone backward", ledger.oracleKeyId >= BigInt(snapshot.oracleKeyId), `id ${ledger.oracleKeyId}`);
    if (ledger.oracleKeyId === BigInt(snapshot.oracleKeyId)) {
      check(
        "ledger: oracle public key",
        ledger.oraclePublicKey.x.toString(16) === snapshot.oraclePublicKey.x && ledger.oraclePublicKey.y.toString(16) === snapshot.oraclePublicKey.y,
      );
    }
    check(
      "ledger: no fewer used nullifiers than recorded",
      Number(ledger.usedNullifiers.size()) >= snapshot.usedNullifiers,
      `${ledger.usedNullifiers.size()} now, ${snapshot.usedNullifiers} recorded`,
    );

    // A status never moves backward; it can only be extended, or removed by a revocation.
    for (const v of snapshot.verified) {
      const subject = new Uint8Array(Buffer.from(v.subject, "hex"));
      const short = `${v.subject.slice(0, 10)}…`;
      if (ledger.verifiedUntil.member(subject)) {
        check(`verified subject ${short}: still verified, not shortened`, ledger.verifiedUntil.lookup(subject) >= BigInt(v.validUntil));
      } else {
        check(`verified subject ${short}: removed only by revocation`, ledger.revokedAt.member(subject));
      }
    }
    // A revocation is permanent, its epoch never decreases, and it leaves no status behind.
    for (const r of snapshot.revoked) {
      const subject = new Uint8Array(Buffer.from(r.subject, "hex"));
      const short = `${r.subject.slice(0, 10)}…`;
      const present = ledger.revokedAt.member(subject);
      check(`revoked subject ${short}: still revoked`, present);
      if (present) check(`revoked subject ${short}: epoch has not gone backward`, ledger.revokedAt.lookup(subject) >= BigInt(r.epoch));
    }
  }

  // Invariants of the live ledger, independent of the snapshot.
  const now = BigInt(Math.floor(Date.now() / 1000));
  let active = 0;
  for (const [subject, until] of ledger.verifiedUntil) {
    if (until > now) active += 1;
    if (ledger.revokedAt.member(subject)) {
      // Re-verification after a revocation is allowed, but only with a later attestation.
      check(`subject ${toHex(subject).slice(0, 10)}…: status postdates its revocation`, until > ledger.revokedAt.lookup(subject));
    }
  }
  check(
    "invariant: every status was created by a distinct attestation",
    ledger.usedNullifiers.size() >= ledger.verifiedUntil.size(),
    `${ledger.usedNullifiers.size()} nullifiers, ${ledger.verifiedUntil.size()} statuses`,
  );
  console.log(`\nlive ledger: ${ledger.verifiedUntil.size()} verified (${active} unexpired), ${ledger.revokedAt.size()} revoked, ${ledger.usedNullifiers.size()} nullifiers used`);
}

if (!record) {
  console.log(`\n${passed} checks passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}
// The indexer provider keeps a socket open.
setTimeout(() => process.exit(process.exitCode ?? 0), 200);
