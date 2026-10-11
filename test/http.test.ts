// The HTTP adapter with real Request/Response objects: multipart parsing,
// headers, the challenge flow and metrics. The extractor is a stub.
import { describe, expect, it } from "vitest";
import { openDatabase } from "../lib/db.ts";
import { DocumentRegistry } from "../lib/document-registry.ts";
import { accessChallengeRoute, accessCheckRoute, challengeRoute, metricsRoute, statusRoute, verifyRoute } from "../lib/http.ts";
import { IdempotencyStore } from "../lib/idempotency.ts";
import { Metrics } from "../lib/metrics.ts";
import { encodeSignature } from "../lib/oracle-signer.ts";
import { SqliteRateLimiter } from "../lib/rate-limit.ts";
import type { Gateway } from "../lib/server.ts";
import { ChallengeStore, proveSubjectOwnership } from "../lib/subject-ownership.ts";
import { deserializeIssued } from "../lib/gateway.ts";
import { extraction, POLICY } from "./fixtures.ts";
import { bytes, World } from "./harness.ts";
import { samplePayslip } from "./pdf.ts";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const be32 = (x: bigint) => x.toString(16).padStart(64, "0");
const TOKEN = "Bearer test-token-0123456789";
const BASE = "http://gateway.test";

function rig() {
  const world = new World();
  const db = openDatabase(":memory:");
  const metrics = new Metrics();
  const now = Math.floor(Date.now() / 1000);
  const today = new Date().toISOString().slice(0, 10);
  const gateway: Gateway = {
    metrics,
    publicConfig: {} as Gateway["publicConfig"],
    deps: {
      config: {
        domain: world.domain,
        policyId: world.policyId,
        contractAddress: world.addressBytes,
        policy: POLICY,
        maxDocumentBytes: 64 * 1024,
        attestationTtl: 900,
        statusTtl: 86_400,
        fingerprintKey: bytes(32, 0xf1),
      },
      authenticate: async (a) =>
        a === TOKEN ? { principal: "acct-1", identity: { method: "govIdCamera", verifiedName: "Maria Jose Garcia" } } : undefined,
      challenges: new ChallengeStore(db),
      idempotency: new IdempotencyStore(db),
      rateLimiter: new SqliteRateLimiter(db, { perWindow: 50, windowSeconds: 60, perMonth: 500 }),
      registry: new DocumentRegistry(db),
      extractor: {
        id: "stub",
        extract: async () => extraction({ documentDate: today, periodStart: today, periodEnd: today }),
      },
      signer: world.oracle,
      chain: {
        revokedAt: async () => undefined,
        verifiedUntil: async (s) => (world.ledger.verifiedUntil.member(s) ? world.ledger.verifiedUntil.lookup(s) : undefined),
      },
      logger: {
        info: (event, fields) => {
          if (event === "subject_ownership_failed") metrics.ownershipFailures.inc();
          if (event === "verify" && fields.status === 201) metrics.documentsVerified.inc();
        },
        error: () => undefined,
      },
      now: () => now,
    },
  };
  world.time = now;
  return { world, gateway, metrics };
}

async function challenge(gateway: Gateway, subject: Uint8Array, authorization = TOKEN) {
  return challengeRoute(
    new Request(`${BASE}/api/v1/challenge`, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ subject: hex(subject) }),
    }),
    gateway,
  );
}

function verifyRequest(form: FormData, headers: Record<string, string> = {}) {
  return new Request(`${BASE}/api/v1/verify`, {
    method: "POST",
    headers: { authorization: TOKEN, "idempotency-key": "idem-http-0001", ...headers },
    body: form,
  });
}

describe("HTTP adapter", () => {
  it("challenge -> sign -> multipart verify -> attestation redeems -> status", async () => {
    const { world, gateway, metrics } = rig();

    const c = await challenge(gateway, world.subject);
    expect(c.status).toBe(201);
    expect(c.headers.get("cache-control")).toBe("no-store");
    const { serverNonce, challenge: digest } = (await c.json()) as { serverNonce: string; challenge: string };

    const proof = proveSubjectOwnership(gateway.deps.config, world.userSecret, new Uint8Array(Buffer.from(serverNonce, "hex")));
    expect(digest).toHaveLength(64);

    const form = new FormData();
    form.set("subject", hex(proof.subject));
    form.set("ownerKey", be32(proof.ownerKey.x) + be32(proof.ownerKey.y));
    form.set("serverNonce", serverNonce);
    form.set("ownershipSignature", hex(encodeSignature(proof.signature)));
    form.set("document", new Blob([new Uint8Array(samplePayslip())], { type: "text/plain" }), "payslip.pdf");

    const r = await verifyRoute(verifyRequest(form), gateway);
    expect(r.status).toBe(201);
    expect(r.headers.get("content-type")).toBe("application/json");
    const body = (await r.json()) as { status: string; attestation: Record<string, unknown> };
    expect(body.status).toBe("eligible");

    const { attestation, signature } = deserializeIssued(body.attestation);
    world.submit(attestation, signature);

    const s = await statusRoute(hex(world.subject), gateway);
    expect(s.status).toBe(200);
    expect(await s.json()).toMatchObject({ verified: true });

    const text = await metricsRoute(gateway).text();
    expect(text).toContain('http_requests_total{endpoint="/v1/verify",method="POST",status="201"} 1');
    expect(text).toContain('http_requests_total{endpoint="/v1/challenge",method="POST",status="201"} 1');
    expect(text).toContain("documents_verified_total 1");
    expect(text).toContain("http_request_duration_seconds_count");
    expect(metrics.documentsVerified.get()).toBe(1);
    // No identifying label values anywhere in the exposition.
    for (const leak of [hex(world.subject), "acct-1", "Maria"]) expect(text).not.toContain(leak);
  });

  it("challenge: 401 without a session, 400 for a malformed subject or body", async () => {
    const { world, gateway } = rig();
    expect((await challenge(gateway, world.subject, "Bearer nope")).status).toBe(401);
    expect((await challenge(gateway, bytes(31, 1))).status).toBe(400);
    const notJson = new Request(`${BASE}/api/v1/challenge`, { method: "POST", headers: { authorization: TOKEN }, body: "{" });
    expect((await challengeRoute(notJson, gateway)).status).toBe(400);
  });

  it("verify: non-multipart body is 400, declared oversize is 413 before the body is read", async () => {
    const { gateway } = rig();
    const plain = new Request(`${BASE}/api/v1/verify`, {
      method: "POST",
      headers: { authorization: TOKEN, "content-type": "application/json" },
      body: "{}",
    });
    expect((await verifyRoute(plain, gateway)).status).toBe(400);

    const huge = new Request(`${BASE}/api/v1/verify`, {
      method: "POST",
      headers: { authorization: TOKEN, "content-length": String(10 * 1024 * 1024), "content-type": "multipart/form-data; boundary=x" },
      body: "--x--",
    });
    const r = await verifyRoute(huge, gateway);
    expect(r.status).toBe(413);
    expect(await r.json()).toEqual({ error: "document_too_large" });
  });

  it("verify: a forged ownership proof is 403 and counted", async () => {
    const { world, gateway, metrics } = rig();
    const c = await challenge(gateway, world.subject);
    const { serverNonce } = (await c.json()) as { serverNonce: string };
    const forged = proveSubjectOwnership(gateway.deps.config, bytes(32, 0x66), new Uint8Array(Buffer.from(serverNonce, "hex")));

    const form = new FormData();
    form.set("subject", hex(world.subject)); // the victim's subject
    form.set("ownerKey", be32(forged.ownerKey.x) + be32(forged.ownerKey.y));
    form.set("serverNonce", serverNonce);
    form.set("ownershipSignature", hex(encodeSignature(forged.signature)));
    form.set("document", new Blob([new Uint8Array(samplePayslip())]), "payslip.pdf");

    const r = await verifyRoute(verifyRequest(form), gateway);
    expect(r.status).toBe(403);
    expect(metrics.ownershipFailures.get()).toBe(1);
    expect(metrics.documentsVerified.get()).toBe(0);
  });

  it("status: 404 for an unknown subject, 400 for a malformed one", async () => {
    const { world, gateway } = rig();
    expect((await statusRoute(hex(world.subject), gateway)).status).toBe(404);
    expect((await statusRoute("not-hex", gateway)).status).toBe(400);
  });

  it("an unconfigured deployment answers 503 without leaking why", async () => {
    const saved = process.env.CIPHERCOMPLY_POLICY_ID;
    delete process.env.CIPHERCOMPLY_POLICY_ID;
    delete (globalThis as { __ciphercomplyGateway?: unknown }).__ciphercomplyGateway;
    try {
      const r = await statusRoute("00".repeat(32));
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ error: "not_configured" });
    } finally {
      if (saved !== undefined) process.env.CIPHERCOMPLY_POLICY_ID = saved;
    }
  });
});

describe("development secrets in production", () => {
  it("are allowed outside production", async () => {
    const { devSecretsAllowed } = await import("../lib/server.ts");
    expect(devSecretsAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(devSecretsAllowed({})).toBe(true);
  });

  it("are refused in production by default", async () => {
    const { devSecretsAllowed } = await import("../lib/server.ts");
    expect(devSecretsAllowed({ NODE_ENV: "production", MIDNIGHT_NETWORK: "preview" })).toBe(false);
    expect(devSecretsAllowed({ NODE_ENV: "production", CIPHERCOMPLY_DEMO_MODE: "true", MIDNIGHT_NETWORK: "preview" })).toBe(false);
  });

  it("are allowed in production only for a declared demo on Preview", async () => {
    const { devSecretsAllowed } = await import("../lib/server.ts");
    expect(devSecretsAllowed({ NODE_ENV: "production", CIPHERCOMPLY_DEMO_MODE: "preview-demo", MIDNIGHT_NETWORK: "preview" })).toBe(true);
    expect(devSecretsAllowed({ NODE_ENV: "production", CIPHERCOMPLY_DEMO_MODE: "preview-demo", MIDNIGHT_NETWORK: "mainnet" })).toBe(false);
    expect(devSecretsAllowed({ NODE_ENV: "production", CIPHERCOMPLY_DEMO_MODE: "preview-demo" })).toBe(false);
  });
});

describe("example relying party", () => {
  const post = (path: string, body: unknown) =>
    new Request(`${BASE}/api/example/access/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  /** Asks for a nonce, signs it with `secret`, and presents the proof. */
  async function knock(gateway: Gateway, subject: Uint8Array, secret: Uint8Array, nonceOverride?: string) {
    const c = await accessChallengeRoute(post("challenge", { subject: hex(subject) }), gateway);
    expect(c.status).toBe(201);
    const serverNonce = nonceOverride ?? ((await c.json()) as { serverNonce: string }).serverNonce;
    const proof = proveSubjectOwnership(gateway.deps.config, secret, new Uint8Array(Buffer.from(serverNonce, "hex")));
    const r = await accessCheckRoute(
      post("check", {
        subject: hex(subject),
        ownerKey: be32(proof.ownerKey.x) + be32(proof.ownerKey.y),
        serverNonce,
        ownershipSignature: hex(encodeSignature(proof.signature)),
      }),
      gateway,
    );
    return { status: r.status, body: (await r.json()) as Record<string, string> };
  }

  const onChain = (gateway: Gateway, validUntil: bigint | undefined) => {
    gateway.deps.chain = { revokedAt: async () => undefined, verifiedUntil: async () => validUntil };
  };

  it("grants access to the holder of a verified subject, without a session", async () => {
    const { world, gateway } = rig();
    const validUntil = BigInt(gateway.deps.now() + 3600);
    onChain(gateway, validUntil);
    const r = await knock(gateway, world.subject, world.userSecret);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ access: "granted", validUntil: validUntil.toString() });
  });

  it("denies a subject the chain does not show as verified", async () => {
    const { world, gateway } = rig();
    onChain(gateway, undefined);
    const r = await knock(gateway, world.subject, world.userSecret);
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe("not_verified");
  });

  it("denies an expired verification", async () => {
    const { world, gateway } = rig();
    onChain(gateway, BigInt(gateway.deps.now() - 1));
    const r = await knock(gateway, world.subject, world.userSecret);
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe("expired");
  });

  it("denies someone who knows a verified subject but not its key", async () => {
    const { world, gateway } = rig();
    onChain(gateway, BigInt(gateway.deps.now() + 3600));
    const r = await knock(gateway, world.subject, bytes(32, 0x5a));
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe("ownership_not_proven");
  });

  it("does not accept a nonce issued by the verification API", async () => {
    const { world, gateway } = rig();
    onChain(gateway, BigInt(gateway.deps.now() + 3600));
    const c = await challenge(gateway, world.subject);
    const { serverNonce } = (await c.json()) as { serverNonce: string };
    const r = await knock(gateway, world.subject, world.userSecret, serverNonce);
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe("ownership_not_proven");
  });

  it("rejects malformed requests", async () => {
    const { gateway } = rig();
    expect((await accessChallengeRoute(post("challenge", { subject: "zz" }), gateway)).status).toBe(400);
    expect((await accessChallengeRoute(post("challenge", {}), gateway)).status).toBe(400);
    expect((await accessCheckRoute(post("check", { subject: "00".repeat(32) }), gateway)).status).toBe(400);
  });
});
