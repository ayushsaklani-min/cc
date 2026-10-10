// Live smoke test of the running web app's /api/v1 routes, as a real client:
// derive a subject locally, fetch a challenge, sign it, upload a document.
//
//   npm run api:smoke -- http://localhost:3000
//
// Uses the first dev session token and a throwaway user secret. Prints status
// codes and reason codes only.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { text32, toHex } from "../lib/encoding.ts";
import { encodeSignature } from "../lib/oracle-signer.ts";
import { proveSubjectOwnership, subjectOf, type OwnershipContext } from "../lib/subject-ownership.ts";
import { samplePayslip } from "../test/pdf.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const base = process.argv[2] ?? "http://localhost:3000";
const env = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`missing environment variable ${name}`);
  return v;
};

const token = Object.keys(JSON.parse(env("DEV_SESSION_TOKENS")) as Record<string, unknown>)[0];
const authorization = `Bearer ${token}`;
const ctx: OwnershipContext = {
  domain: text32(env("CIPHERCOMPLY_DOMAIN")),
  policyId: text32(env("CIPHERCOMPLY_POLICY_ID")),
  contractAddress: encodeContractAddress(env("CIPHERCOMPLY_CONTRACT_ADDRESS")),
};
const userSecret = new Uint8Array(randomBytes(32));
const subject = toHex(subjectOf(ctx, userSecret));
const be32 = (x: bigint) => x.toString(16).padStart(64, "0");

let failures = 0;
const check = (name: string, got: number, want: number, detail = "") => {
  const ok = got === want;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: HTTP ${got}${ok ? "" : ` (expected ${want})`} ${detail}`);
};
const brief = (body: unknown) => {
  const b = body as { error?: string; status?: string; reason?: string };
  return [b.error, b.status, b.reason].filter(Boolean).join(" / ");
};

async function challenge(auth: string | undefined, subjectHex: string) {
  const r = await fetch(`${base}/api/v1/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify({ subject: subjectHex }),
  });
  return { status: r.status, body: (await r.json()) as { serverNonce?: string } };
}

async function verify(secret: Uint8Array, claimedSubject: string, serverNonce: string, document: Uint8Array, key: string) {
  const proof = proveSubjectOwnership(ctx, secret, new Uint8Array(Buffer.from(serverNonce, "hex")));
  const form = new FormData();
  form.set("subject", claimedSubject);
  form.set("ownerKey", be32(proof.ownerKey.x) + be32(proof.ownerKey.y));
  form.set("serverNonce", serverNonce);
  form.set("ownershipSignature", toHex(encodeSignature(proof.signature)));
  form.set("document", new Blob([new Uint8Array(document)]), "document.pdf");
  const r = await fetch(`${base}/api/v1/verify`, { method: "POST", headers: { authorization, "idempotency-key": key }, body: form });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}

check("challenge without a session", (await challenge(undefined, subject)).status, 401);
check("challenge with a malformed subject", (await challenge(authorization, "zz")).status, 400);
const c = await challenge(authorization, subject);
check("challenge", c.status, 201);
const nonce = c.body.serverNonce ?? "";

const forged = await verify(new Uint8Array(randomBytes(32)), subject, nonce, samplePayslip(), randomUUID());
check("verify with another key's proof", forged.status, 403, brief(forged.body));

const notPdf = await verify(userSecret, subject, nonce, new TextEncoder().encode("MZ not a document"), randomUUID());
check("verify with a non-document upload", notPdf.status, 415, brief(notPdf.body));

const key = randomUUID();
const ok = await verify(userSecret, subject, nonce, samplePayslip(), key);
check("verify with a real extraction", ok.status, 201, brief(ok.body));
const replay = await verify(userSecret, subject, nonce, samplePayslip(), key);
check("same Idempotency-Key replays", replay.status, ok.status, JSON.stringify(replay.body) === JSON.stringify(ok.body) ? "(identical body)" : "(DIFFERENT body)");

const low = await verify(userSecret, subject, nonce, samplePayslip({ gross: "3,000.00" }), randomUUID());
check("verify below the threshold", low.status, 422, brief(low.body));

const status = await fetch(`${base}/api/v1/status/${subject}`);
check("status before settlement", status.status, 404);

const metrics = await (await fetch(`${base}/api/metrics`)).text();
console.log(metrics.split("\n").filter((l) => /^(http_requests_total|documents_verified_total|subject_ownership_failures_total)/.test(l)).join("\n"));
process.exit(failures === 0 ? 0 : 1);
