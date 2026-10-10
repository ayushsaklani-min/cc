// Full end-to-end test on the configured network, using the funded server
// wallet in place of a browser wallet:
//
//   client -> POST /v1/challenge -> ownership proof -> POST /v1/verify (real
//   extraction, real oracle signature) -> prove -> submit on-chain -> indexed
//   ledger -> GET /v1/status
//
// followed by the rejection cases and revocation. Needs the web app running.
//
//   npm run e2e:full -- http://localhost:3000
//
// A case passes only on the exact expected outcome: for rejections, the
// contract's own assertion message. Exits non-zero otherwise.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits, type Attestation, type OracleSignature } from "../contracts/managed/ciphercomply/contract/index.js";
import { parseIssuedAttestation } from "../lib/browser-submit.ts";
import { generateUserSecret, proofFields, proveOwnership, subjectOfSecret } from "../lib/client-ownership.ts";
import { text32, toHex } from "../lib/encoding.ts";
import { loadNetworkConfig } from "../lib/midnight/config.ts";
import { configureProviders, join, PRIVATE_STATE_ID, readLedger } from "../lib/midnight/contract.ts";
import { startWallet, stopWallet } from "../lib/midnight/wallet.ts";
import { generateSecretScalar, localSchnorrSigner } from "../lib/oracle-signer.ts";
import type { PrivateState } from "../lib/witnesses.ts";
import { samplePayslip } from "../test/pdf.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const base = process.argv[2] ?? "http://localhost:3000";
const config = loadNetworkConfig();
const env = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`missing environment variable ${name}`);
  return v;
};

const token = process.env.E2E_SESSION_TOKEN ?? Object.keys(JSON.parse(env("DEV_SESSION_TOKENS")) as Record<string, unknown>)[0];
const authorization = `Bearer ${token}`;
const contractAddress = env("CIPHERCOMPLY_CONTRACT_ADDRESS");
const addressBytes = encodeContractAddress(contractAddress);
const ctx = { domain: text32(env("CIPHERCOMPLY_DOMAIN")), policyId: text32(env("CIPHERCOMPLY_POLICY_ID")), contractAddress: addressBytes };
const oracle = localSchnorrSigner(BigInt(env("ORACLE_DEV_SECRET_SCALAR")));
const adminSecretKey = new Uint8Array(Buffer.from(env("ADMIN_DEV_SECRET_HEX"), "hex"));

let failures = 0;
const check = (name: string, pass: boolean, detail: string) => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}: ${detail}`);
  if (!pass) failures += 1;
};
const firstLine = (e: unknown) => (e instanceof Error ? (e.message.split("\n")[0] ?? "") : String(e)).slice(0, 160);

// ---------- 1. Off-chain: the real API, as a browser client would call it ----------

const userSecret = generateUserSecret();
const subject = subjectOfSecret(ctx, userSecret);
const subjectHex = toHex(subject);
console.log(`contract ${contractAddress}\nsubject  ${subjectHex}\n`);

const challenge = await fetch(`${base}/api/v1/challenge`, {
  method: "POST",
  headers: { authorization, "content-type": "application/json" },
  body: JSON.stringify({ subject: subjectHex }),
});
const { serverNonce } = (await challenge.json()) as { serverNonce?: string };
check("API: challenge issued", challenge.status === 201 && !!serverNonce, `HTTP ${challenge.status}`);
if (!serverNonce) process.exit(1);

async function apiVerify(document: Uint8Array) {
  const proof = await proveOwnership(ctx, userSecret, new Uint8Array(Buffer.from(serverNonce as string, "hex")));
  const form = new FormData();
  for (const [k, v] of Object.entries(proofFields(proof))) form.set(k, v);
  form.set("document", new Blob([new Uint8Array(document)]), "payslip.pdf");
  const started = Date.now();
  const r = await fetch(`${base}/api/v1/verify`, { method: "POST", headers: { authorization, "idempotency-key": randomUUID() }, body: form });
  return { status: r.status, body: (await r.json()) as Record<string, unknown>, seconds: Math.round((Date.now() - started) / 1000) };
}

// A unique figure per run, so the document has not been used before.
const gross = `7,${String(500 + Math.floor(Math.random() * 400))}.${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
const issuedResponse = await apiVerify(samplePayslip({ gross }));
check(
  "API: document extracted, policy passed, attestation signed",
  issuedResponse.status === 201 && issuedResponse.body.status === "eligible",
  `HTTP ${issuedResponse.status} ${String(issuedResponse.body.status ?? issuedResponse.body.error ?? "")} ${String(issuedResponse.body.reason ?? "")} (${issuedResponse.seconds} s)`,
);
if (issuedResponse.status !== 201) process.exit(1);
const issued = parseIssuedAttestation(issuedResponse.body.attestation as Record<string, string | number | boolean>);

const before = await fetch(`${base}/api/v1/status/${subjectHex}`);
check("API: status before settlement is 404", before.status === 404, `HTTP ${before.status}`);

// ---------- 2. On-chain, with the funded wallet ----------

const wallet = await startWallet(config, env("MIDNIGHT_WALLET_SEED"));
const providers = await configureProviders(wallet, config);
const privateState = (userSecretKey: Uint8Array, attestation?: Attestation, signature?: OracleSignature): PrivateState => ({
  userSecretKey,
  adminSecretKey,
  attestation,
  signature,
});
const contract = await join(providers, contractAddress, privateState(userSecret));

type Outcome = { ok: true; txId: string; blockHeight: number; seconds: number } | { ok: false; error: string };
async function call(state: PrivateState, run: () => Promise<{ public: { txId: string; blockHeight: number } }>): Promise<Outcome> {
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, state);
  const started = Date.now();
  try {
    const tx = await run();
    return { ok: true, txId: tx.public.txId, blockHeight: tx.public.blockHeight, seconds: Math.round((Date.now() - started) / 1000) };
  } catch (e) {
    return { ok: false, error: firstLine(e) };
  }
}
const redeem = (secret: Uint8Array, a: Attestation, s: OracleSignature) =>
  call(privateState(secret, a, s), () => contract.callTx.verifyAndRegister());
const settled = (o: Outcome) => (o.ok ? `tx ${o.txId} in block ${o.blockHeight}, ${o.seconds} s` : o.error);
const rejectedWith = (name: string, o: Outcome, message: string) =>
  check(name, !o.ok && o.error.includes(message), o.ok ? `UNEXPECTEDLY SETTLED: tx ${o.txId}` : o.error);
const sign = (a: Attestation, signer = oracle) => signer.signSync(pureCircuits.attestationDigest(a));

// Negative cases first, while nothing is registered: each must fail on its own assertion.
rejectedWith("chain: attestation redeemed with another user's secret", await redeem(generateUserSecret(), issued.attestation, issued.signature), "Subject mismatch");

const tampered = { ...issued.attestation, amountMinorUnits: issued.attestation.amountMinorUnits + 1n };
rejectedWith("chain: API signature reused with a modified amount", await redeem(userSecret, tampered, issued.signature), "Invalid oracle signature");

const longer = { ...issued.attestation, statusValidUntil: issued.attestation.statusValidUntil + 31_536_000n };
rejectedWith("chain: API signature reused with a longer validity", await redeem(userSecret, longer, issued.signature), "Invalid oracle signature");

const rogue = localSchnorrSigner(generateSecretScalar());
rejectedWith("chain: attestation signed by a rogue oracle key", await redeem(userSecret, issued.attestation, sign(issued.attestation, rogue)), "Invalid oracle signature");

const lowAssurance = { ...issued.attestation, assuranceLevel: 1n, nonce: new Uint8Array(randomBytes(32)) };
rejectedWith("chain: validly signed attestation below the minimum assurance", await redeem(userSecret, lowAssurance, sign(lowAssurance)), "Assurance below policy minimum");

const notEligible = { ...issued.attestation, eligible: false, nonce: new Uint8Array(randomBytes(32)) };
rejectedWith("chain: validly signed attestation with eligible=false", await redeem(userSecret, notEligible, sign(notEligible)), "Not eligible");

const now = Math.floor(Date.now() / 1000);
const expired = { ...issued.attestation, issuedAt: BigInt(now - 2000), expiresAt: BigInt(now - 1000), nonce: new Uint8Array(randomBytes(32)) };
rejectedWith("chain: validly signed attestation already expired", await redeem(userSecret, expired, sign(expired)), "Attestation expired");

// The real thing: the attestation the API issued.
const settlement = await redeem(userSecret, issued.attestation, issued.signature);
check("chain: API-issued attestation settles", settlement.ok, settled(settlement));

if (settlement.ok) {
  const l = await readLedger(providers, contractAddress);
  const registered = l !== undefined && l.verifiedUntil.member(subject) && l.verifiedUntil.lookup(subject) === issued.attestation.statusValidUntil;
  const consumed = l !== undefined && l.usedNullifiers.member(pureCircuits.nullifierFor(addressBytes, issued.attestation.nonce));
  check("chain: indexed ledger shows the subject and the nullifier", registered && consumed, `verifiedUntil=${registered}, nullifier=${consumed}`);

  const after = await fetch(`${base}/api/v1/status/${subjectHex}`);
  const body = (await after.json()) as { verified?: boolean; validUntil?: string };
  check(
    "API: status after settlement is verified",
    after.status === 200 && body.verified === true && body.validUntil === issued.attestation.statusValidUntil.toString(),
    `HTTP ${after.status} verified=${String(body.verified)} validUntil=${String(body.validUntil)}`,
  );

  rejectedWith("chain: replay of the settled attestation", await redeem(userSecret, issued.attestation, issued.signature), "Attestation already used");

  const shorter = { ...issued.attestation, statusValidUntil: issued.attestation.statusValidUntil - 3600n, nonce: new Uint8Array(randomBytes(32)) };
  rejectedWith("chain: new attestation that would shorten the status", await redeem(userSecret, shorter, sign(shorter)), "Status would move backward");

  // ---------- 3. Revocation ----------

  const revoke = (adminKey: Uint8Array, atTime: number) =>
    call({ ...privateState(userSecret), adminSecretKey: adminKey }, () => contract.callTx.revokeSubject(subject, BigInt(atTime)));

  rejectedWith("chain: revocation by a non-admin", await revoke(new Uint8Array(randomBytes(32)), now), "Not admin");
  rejectedWith("chain: revocation dated in the future", await revoke(adminSecretKey, now + 86_400), "Revocation in the future");

  // Dated after the attestation was issued and safely before current chain time.
  const revokedAt = Math.floor(Date.now() / 1000) - 30;
  const revocation = await revoke(adminSecretKey, revokedAt);
  check("chain: admin revokes the subject", revocation.ok, settled(revocation));

  if (revocation.ok) {
    const l2 = await readLedger(providers, contractAddress);
    const cleared = l2 !== undefined && !l2.verifiedUntil.member(subject) && l2.revokedAt.member(subject) && l2.revokedAt.lookup(subject) === BigInt(revokedAt);
    check("chain: indexed ledger shows the revocation and no status", cleared, `cleared=${cleared}`);

    const gone = await fetch(`${base}/api/v1/status/${subjectHex}`);
    check("API: status after revocation is 404", gone.status === 404, `HTTP ${gone.status}`);

    const resurrect = { ...issued.attestation, nonce: new Uint8Array(randomBytes(32)) }; // issuedAt predates the revocation
    rejectedWith("chain: pre-revocation attestation cannot resurrect the subject", await redeem(userSecret, resurrect, sign(resurrect)), "Issued before revocation");

    rejectedWith("chain: revocation epoch cannot move backward", await revoke(adminSecretKey, revokedAt - 60), "Revocation epoch moved backward");

    // The oracle must refuse a revoked subject before it reads any document.
    const refused = await apiVerify(samplePayslip({ gross: "9,100.00" }));
    check(
      "API: oracle refuses to issue for the revoked subject",
      refused.status === 422 && refused.body.reason === "subject_revoked",
      `HTTP ${refused.status} ${String(refused.body.reason ?? refused.body.error ?? "")}`,
    );
  }
}

await stopWallet(wallet);
console.log(failures === 0 ? "\nALL CASES PASSED" : `\n${failures} CASE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
