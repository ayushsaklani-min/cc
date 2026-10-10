// HTTP adapter for the /v1 API: Web Request in, Web Response out. It parses the
// transport, calls the framework-independent handlers in gateway.ts and records
// request metrics. Route files in the web app delegate here.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fromHex, toHex } from "./encoding.ts";
import { handleStatus, handleVerify, type GatewayResponse, type VerifyRequest } from "./gateway.ts";
import { getGateway, NotConfiguredError, type Gateway } from "./server.ts";
import { challengeDigest } from "./subject-ownership.ts";

const json = (r: GatewayResponse): Response =>
  new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const clientIp = (request: Request): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

const field = (form: FormData, name: string): string | undefined => {
  const v = form.get(name);
  return typeof v === "string" ? v : undefined;
};

/** Runs a handler with the configured gateway, timing it and mapping configuration errors to 503. */
async function serve(
  endpoint: string,
  method: string,
  handler: (gateway: Gateway) => Promise<GatewayResponse>,
  gateway?: Gateway,
): Promise<Response> {
  const started = performance.now();
  let g: Gateway;
  try {
    g = gateway ?? getGateway();
  } catch (e) {
    if (!(e instanceof NotConfiguredError)) throw e;
    // The reason names a variable, not a value; it is logged server-side only.
    console.error(JSON.stringify({ level: "error", event: "not_configured", detail: e.message }));
    return json({ status: 503, body: { error: "not_configured" } });
  }
  let result: GatewayResponse;
  try {
    result = await handler(g);
  } catch (e) {
    const correlationId = randomUUID();
    g.deps.logger.error("unhandled", { correlationId, errorType: e instanceof Error ? e.constructor.name : typeof e });
    result = { status: 500, body: { error: "internal_error", correlationId } };
  }
  g.metrics.observeHttp(endpoint, method, result.status, (performance.now() - started) / 1000);
  return json(result);
}

/**
 * POST /v1/challenge  { "subject": "<64 hex>" }
 * Issues the server nonce the client signs to prove it controls the subject.
 */
export function challengeRoute(request: Request, gateway?: Gateway): Promise<Response> {
  return serve(
    "/v1/challenge",
    "POST",
    async ({ deps }) => {
      const session = await deps.authenticate(request.headers.get("authorization") ?? undefined);
      if (!session) return { status: 401, body: { error: "unauthenticated" } };

      let subject: Uint8Array;
      try {
        const body = (await request.json()) as { subject?: unknown };
        subject = fromHex(String(body.subject), 32);
      } catch {
        return { status: 400, body: { error: "malformed_request", reason: "subject" } };
      }
      const now = deps.now();
      if (!deps.rateLimiter.allow([`challenge:${session.principal}`, `challenge-ip:${clientIp(request)}`], now)) {
        return { status: 429, body: { error: "rate_limited" } };
      }
      const challenge = deps.challenges.issue(session.principal, subject, now);
      return {
        status: 201,
        body: {
          serverNonce: toHex(challenge.serverNonce),
          // What the client signs; it can and should recompute this itself.
          challenge: toHex(challengeDigest(deps.config, challenge.serverNonce, subject)),
          expiresAt: challenge.expiresAt,
        },
      };
    },
    gateway,
  );
}

/**
 * POST /v1/verify  multipart/form-data
 *   headers: Authorization, Idempotency-Key
 *   fields:  subject, ownerKey, serverNonce, ownershipSignature (hex), document (file)
 */
export function verifyRoute(request: Request, gateway?: Gateway): Promise<Response> {
  return serve(
    "/v1/verify",
    "POST",
    async ({ deps }) => {
      // Refuse an oversized body before buffering it. The multipart envelope adds a little overhead.
      const declared = Number(request.headers.get("content-length") ?? "0");
      if (declared > deps.config.maxDocumentBytes + 64 * 1024) {
        return { status: 413, body: { error: "document_too_large" } };
      }
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return { status: 400, body: { error: "malformed_request", reason: "body" } };
      }
      const file = form.get("document");
      const parsed: VerifyRequest = {
        authorization: request.headers.get("authorization") ?? undefined,
        idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
        clientIp: clientIp(request),
        subjectHex: field(form, "subject"),
        ownerKeyHex: field(form, "ownerKey"),
        serverNonceHex: field(form, "serverNonce"),
        ownershipSignatureHex: field(form, "ownershipSignature"),
        document: file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : undefined,
      };
      return handleVerify(deps, parsed);
    },
    gateway,
  );
}

/** GET /v1/status/{subject} */
export function statusRoute(subjectHex: string, gateway?: Gateway): Promise<Response> {
  return serve("/v1/status", "GET", ({ deps }) => handleStatus(deps, subjectHex), gateway);
}

/** GET /v1/session. Tells the client whether its session is valid and at what assurance method. */
export function sessionRoute(request: Request, gateway?: Gateway): Promise<Response> {
  return serve(
    "/v1/session",
    "GET",
    async ({ deps }) => {
      const session = await deps.authenticate(request.headers.get("authorization") ?? undefined);
      if (!session) return { status: 401, body: { error: "unauthenticated" } };
      return {
        status: 200,
        body: { method: session.identity.method, hasVerifiedName: session.identity.verifiedName !== undefined },
      };
    },
    gateway,
  );
}

/** GET /v1/config. Public, non-secret description of this deployment for the UI. */
export function configRoute(gateway?: Gateway): Promise<Response> {
  return serve("/v1/config", "GET", async (g) => ({ status: 200, body: { ...g.publicConfig } }), gateway);
}

// The compiled circuits' public artifacts. A client proves only verifyAndRegister, but
// Midnight.js fetches every circuit's verifier key when joining, to check the deployed contract.
const ZK_ARTIFACT = /^(?:verifyAndRegister|rotateOracleKey|revokeSubject)\.(prover|verifier|bzkir)$/;
const ZK_DIRECTORY: Record<string, string> = { prover: "keys", verifier: "keys", bzkir: "zkir" };

/**
 * GET /zk/{keys|zkir}/{file}. Serves the compiled circuit's prover key,
 * verifier key and ZKIR to the browser. These are public build outputs.
 */
export async function zkArtifactRoute(kind: string, file: string): Promise<Response> {
  const extension = ZK_ARTIFACT.exec(file)?.[1];
  if (extension === undefined || ZK_DIRECTORY[extension] !== kind) {
    return json({ status: 404, body: { error: "not_found" } });
  }
  const root = process.env.CIPHERCOMPLY_REPO_ROOT ?? process.cwd();
  try {
    const bytes = await readFile(path.resolve(root, "contracts/managed/ciphercomply", kind, file));
    return new Response(new Uint8Array(bytes), {
      headers: { "content-type": "application/octet-stream", "cache-control": "private, max-age=300" },
    });
  } catch {
    return json({ status: 404, body: { error: "not_found" } });
  }
}

/** GET /metrics. Prometheus text format. Must not be exposed publicly. */
export function metricsRoute(gateway?: Gateway): Response {
  try {
    return new Response((gateway ?? getGateway()).metrics.render(), {
      headers: { "content-type": "text/plain; version=0.0.4", "cache-control": "no-store" },
    });
  } catch (e) {
    if (!(e instanceof NotConfiguredError)) throw e;
    return json({ status: 503, body: { error: "not_configured" } });
  }
}
