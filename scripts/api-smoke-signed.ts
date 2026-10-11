// Live smoke test of the signed-record ("over 18") policy through the running
// web app's API, as a real client would call it.
//
//   npx tsx scripts/api-smoke-signed.ts http://localhost:3000 path/to/record.pdf [expected]
//
// `expected` is "eligible" (default) or a refusal reason such as
// "signer_not_trusted". Prints status codes and reason codes only: nothing from
// the document.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { text32, toHex } from "../lib/encoding.ts";
import { encodeSignature } from "../lib/oracle-signer.ts";
import { proveSubjectOwnership } from "../lib/subject-ownership.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const [base = "http://localhost:3000", file, expected = "eligible"] = process.argv.slice(2);
if (!file) throw new Error("usage: api-smoke-signed.ts <base-url> <record.pdf> [expected]");

const POLICY = "age-over-18:v1";
const q = `?policy=${encodeURIComponent(POLICY)}`;
const token = Object.keys(JSON.parse(process.env.DEV_SESSION_TOKENS ?? "{}") as Record<string, unknown>)[0];
if (!token) throw new Error("DEV_SESSION_TOKENS is not set");
const authorization = `Bearer ${token}`;
const be32 = (x: bigint) => x.toString(16).padStart(64, "0");

const config = (await (await fetch(`${base}/api/v1/config${q}`)).json()) as {
  contractAddressBytes: string;
  domain: string;
  policyId: string;
  policy: { kind: string; id: string };
  processing: { extractionProvider: string | null };
};
console.log(`policy ${config.policy.id} (${config.policy.kind}), model: ${config.processing.extractionProvider ?? "none"}`);
if (config.policyId !== toHex(text32(POLICY))) throw new Error("the server did not return the signed-record policy");

const ctx = {
  domain: new Uint8Array(Buffer.from(config.domain, "hex")),
  policyId: new Uint8Array(Buffer.from(config.policyId, "hex")),
  contractAddress: new Uint8Array(Buffer.from(config.contractAddressBytes, "hex")),
};
const userSecret = new Uint8Array(randomBytes(32));
const probe = proveSubjectOwnership(ctx, userSecret, new Uint8Array(32));

const challenge = await fetch(`${base}/api/v1/challenge${q}`, {
  method: "POST",
  headers: { authorization, "content-type": "application/json" },
  body: JSON.stringify({ subject: toHex(probe.subject) }),
});
const { serverNonce } = (await challenge.json()) as { serverNonce: string };
const proof = proveSubjectOwnership(ctx, userSecret, new Uint8Array(Buffer.from(serverNonce, "hex")));

const form = new FormData();
form.set("subject", toHex(proof.subject));
form.set("ownerKey", be32(proof.ownerKey.x) + be32(proof.ownerKey.y));
form.set("serverNonce", serverNonce);
form.set("ownershipSignature", toHex(encodeSignature(proof.signature)));
form.set("document", new Blob([new Uint8Array(readFileSync(file))], { type: "application/pdf" }), "record.pdf");
const r = await fetch(`${base}/api/v1/verify${q}`, { method: "POST", headers: { authorization, "idempotency-key": randomUUID() }, body: form });
const body = (await r.json()) as { status?: string; reason?: string; error?: string; attestation?: Record<string, unknown> };

const got = body.status === "eligible" ? "eligible" : (body.reason ?? body.error ?? "unknown");
const leaked = JSON.stringify(body).match(/[A-Z]{5}[0-9]{4}[A-Z]/) !== null;
const ok = got === expected && !leaked;
console.log(`${ok ? "PASS" : "FAIL"}  HTTP ${r.status} ${got}${ok ? "" : ` (expected ${expected})`}${leaked ? " — response contains a PAN-shaped value" : ""}`);
if (body.attestation) console.log(`      attestation amount ${String(body.attestation.amountMinorUnits)}, keys: ${Object.keys(body.attestation).length}`);
process.exit(ok ? 0 : 1);
