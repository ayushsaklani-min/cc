// Real proving against a running proof server. Skipped unless PROOF_SERVER_URL
// is set, so the default `npm test` needs no external service.
//
// What this establishes: the proof server accepts the compiled ZKIR, the
// witness produced by the compiled JavaScript satisfies that circuit (/check),
// and a proof is produced with the compiled prover key (/prove).
// What it does not: nothing here verifies the proof or settles it on a chain.
import { readFileSync } from "node:fs";
import { proofDataIntoSerializedPreimage, type ProofData } from "@midnight-ntwrk/compact-runtime";
import { createCheckPayload, createProvingPayload, parseCheckResult } from "@midnight-ntwrk/ledger-v8";
import { describe, expect, it } from "vitest";
import { bytes, T0, World } from "./harness.ts";

const url = process.env.PROOF_SERVER_URL;
const managed = new URL("../contracts/managed/ciphercomply/", import.meta.url);
const artifact = (path: string) => new Uint8Array(readFileSync(new URL(path, managed)));

const preimageOf = (circuit: string, p: ProofData) =>
  proofDataIntoSerializedPreimage(p.input, p.output, p.publicTranscript, p.privateTranscriptOutputs, circuit);

async function post(path: string, body: Uint8Array): Promise<{ status: number; body: Uint8Array }> {
  const r = await fetch(`${url}${path}`, { method: "POST", body: new Uint8Array(body) });
  return { status: r.status, body: new Uint8Array(await r.arrayBuffer()) };
}

async function checkAndProve(circuit: string, proofData: ProofData) {
  const preimage = preimageOf(circuit, proofData);
  const ir = artifact(`zkir/${circuit}.bzkir`);

  const checked = await post("/check", createCheckPayload(preimage, ir));
  expect(checked.status, new TextDecoder().decode(checked.body)).toBe(200);
  parseCheckResult(checked.body);

  const started = Date.now();
  const proved = await post(
    "/prove",
    createProvingPayload(preimage, undefined, {
      proverKey: artifact(`keys/${circuit}.prover`),
      verifierKey: artifact(`keys/${circuit}.verifier`),
      ir,
    }),
  );
  expect(proved.status, new TextDecoder().decode(proved.body)).toBe(200);
  expect(proved.body.length).toBeGreaterThan(1000);
  console.log(`${circuit}: proof ${proved.body.length} bytes in ${Date.now() - started} ms`);
}

describe.skipIf(!url)("proof server", { timeout: 600_000 }, () => {
  it("proves verifyAndRegister for a valid attestation", async () => {
    const w = new World();
    const { attestation, signature } = await w.issue();
    await checkAndProve("verifyAndRegister", w.submit(attestation, signature).proofData);
  });

  it("proves revokeSubject and rotateOracleKey", async () => {
    const w = new World();
    await checkAndProve("revokeSubject", w.revoke(bytes(32, 0x42), BigInt(T0)).proofData);
    await checkAndProve("rotateOracleKey", w.rotate(w.oracle.publicKey).proofData);
  });

  it("rejects a witness that does not belong to the circuit", async () => {
    // A revokeSubject witness checked against the verifyAndRegister circuit.
    const w = new World();
    const preimage = preimageOf("verifyAndRegister", w.revoke(bytes(32, 0x42), BigInt(T0)).proofData);
    const r = await post("/check", createCheckPayload(preimage, artifact("zkir/verifyAndRegister.bzkir")));
    expect(r.status).not.toBe(200);
  });
});
