// Composition root for the HTTP gateway: builds the real dependencies from the
// environment. Route files call getGateway() and nothing else.
//
// Two pieces here are development-only and refuse to start in production:
// bearer-token sessions from DEV_SESSION_TOKENS, and an oracle key held in
// process memory. Real authentication and key custody are separate work.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js/network-id";
import { WebSocket } from "ws";
import { openDatabase } from "./db.ts";
import { DocumentRegistry } from "./document-registry.ts";
import { fromHex, text32, toHex } from "./encoding.ts";
import { ACCEPTED_MIME_TYPES, type GatewayDeps, type Session } from "./gateway.ts";
import { geminiExtractor } from "./gemini-extractor.ts";
import { IdempotencyStore } from "./idempotency.ts";
import { Metrics } from "./metrics.ts";
import { chainReader } from "./midnight/chain-reader.ts";
import { localSchnorrSigner } from "./oracle-signer.ts";
import type { Policy, VerificationMethod } from "./policy-engine.ts";
import { SqliteRateLimiter } from "./rate-limit.ts";
import type { PublicConfig } from "./public-config.ts";
import { ChallengeStore } from "./subject-ownership.ts";

export class NotConfiguredError extends Error {}

export type { PublicConfig };

export interface Gateway {
  deps: GatewayDeps;
  metrics: Metrics;
  publicConfig: PublicConfig;
}

const METHODS: readonly VerificationMethod[] = ["emailOtp", "walletSignature", "govIdCamera"];

function env(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") throw new NotConfiguredError(`missing environment variable ${name}`);
  return v;
}

/** The single policy this deployment enforces. Changing it means a new policy id and a new contract. */
export const INCOME_USD_85K_V1: Policy = {
  id: "income-usd-85k:v1",
  version: 1,
  currency: "USD",
  thresholdMinorUnits: 8_500_000n,
  allowedDocumentTypes: ["tax_return", "payslip", "employer_letter"],
  issuerAllowList: [],
  freshnessDays: 90,
  maxPlausibleAnnualMinorUnits: 5_000_000_000n,
  nameMatchPerMille: 850,
  crossCheckToleranceBps: 100n,
};

function devSessions(): (authorization: string | undefined) => Promise<Session | undefined> {
  if (process.env.NODE_ENV === "production") {
    throw new NotConfiguredError("no production authenticator is configured");
  }
  const raw = JSON.parse(env("DEV_SESSION_TOKENS")) as Record<string, { principal: string; method: string; verifiedName?: string }>;
  const sessions = new Map<string, Session>();
  for (const [token, s] of Object.entries(raw)) {
    if (token.length < 16 || !METHODS.includes(s.method as VerificationMethod)) {
      throw new NotConfiguredError("malformed DEV_SESSION_TOKENS entry");
    }
    sessions.set(token, {
      principal: s.principal,
      identity: {
        method: s.method as VerificationMethod,
        ...(s.verifiedName !== undefined ? { verifiedName: s.verifiedName } : {}),
      },
    });
  }
  return async (authorization) => {
    const m = /^Bearer (.+)$/.exec(authorization ?? "");
    return m?.[1] !== undefined ? sessions.get(m[1]) : undefined;
  };
}

function devSigner() {
  if (process.env.NODE_ENV === "production") {
    throw new NotConfiguredError("no production oracle key custody is configured");
  }
  return localSchnorrSigner(BigInt(env("ORACLE_DEV_SECRET_SCALAR")));
}

function build(): Gateway {
  const policyId = env("CIPHERCOMPLY_POLICY_ID");
  if (policyId !== INCOME_USD_85K_V1.id) throw new NotConfiguredError(`no policy implementation for ${policyId}`);
  const issuerAllowList = (JSON.parse(env("POLICY_ISSUER_ALLOW_LIST")) as unknown[]).map(String);

  const contractAddress = env("CIPHERCOMPLY_CONTRACT_ADDRESS");
  setNetworkId(env("MIDNIGHT_NETWORK"));
  (globalThis as { WebSocket?: unknown }).WebSocket ??= WebSocket;
  const publicDataProvider = indexerPublicDataProvider(env("MIDNIGHT_INDEXER_URL"), env("MIDNIGHT_INDEXER_WS_URL"));

  const databasePath = path.resolve(env("DATABASE_PATH"));
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = openDatabase(databasePath);

  const metrics = new Metrics();
  const apiKey = env("GEMINI_API_KEY");
  const log = (level: "info" | "error") => (event: string, fields: Record<string, string | number | boolean>) => {
    if (event === "subject_ownership_failed") metrics.ownershipFailures.inc();
    if (event === "duplicate_document") metrics.duplicateAttempts.inc();
    if (event === "verify" && fields.status === 201) metrics.documentsVerified.inc();
    console[level === "error" ? "error" : "log"](JSON.stringify({ level, event, time: new Date().toISOString(), ...fields }));
  };

  const deps: GatewayDeps = {
    config: {
      domain: text32(env("CIPHERCOMPLY_DOMAIN")),
      policyId: text32(policyId),
      contractAddress: encodeContractAddress(contractAddress),
      policy: { ...INCOME_USD_85K_V1, issuerAllowList },
      maxDocumentBytes: Number(process.env.MAX_DOCUMENT_BYTES ?? 10 * 1024 * 1024),
      attestationTtl: 900,
      statusTtl: Number(process.env.STATUS_TTL_SECONDS ?? 30 * 86_400),
      fingerprintKey: fromHex(env("REGISTRY_FINGERPRINT_KEY"), 32),
    },
    authenticate: devSessions(),
    challenges: new ChallengeStore(db),
    idempotency: new IdempotencyStore(db),
    rateLimiter: new SqliteRateLimiter(db, { perWindow: 10, windowSeconds: 60, perMonth: 200 }),
    registry: new DocumentRegistry(db),
    // A hung provider must not hold a request for minutes: one retry, 30 s each.
    extractor: geminiExtractor({ apiKey, model: env("GEMINI_MODEL"), timeoutMs: 30_000, maxRetries: 1 }),
    crossCheckExtractor: geminiExtractor({
      apiKey,
      model: env("GEMINI_CROSSCHECK_MODEL"),
      timeoutMs: 30_000,
      maxRetries: 1,
    }),
    signer: devSigner(),
    chain: chainReader({ publicDataProvider }, contractAddress),
    logger: { info: log("info"), error: log("error") },
    now: () => Math.floor(Date.now() / 1000),
  };
  const { policy } = deps.config;
  const publicConfig: PublicConfig = {
    network: env("MIDNIGHT_NETWORK"),
    contractAddress,
    contractAddressBytes: toHex(deps.config.contractAddress),
    domain: toHex(deps.config.domain),
    policyId: toHex(deps.config.policyId),
    policy: {
      id: policy.id,
      version: policy.version,
      currency: policy.currency,
      thresholdMinorUnits: policy.thresholdMinorUnits.toString(),
      allowedDocumentTypes: policy.allowedDocumentTypes,
      freshnessDays: policy.freshnessDays,
      crossCheck: policy.crossCheckToleranceBps !== undefined,
    },
    upload: { maxBytes: deps.config.maxDocumentBytes, mimeTypes: ACCEPTED_MIME_TYPES },
    processing: {
      mode: "server-mediated",
      extractionProvider: "Google Gemini API",
      extractionModel: env("GEMINI_MODEL"),
      crossCheckModel: policy.crossCheckToleranceBps !== undefined ? env("GEMINI_CROSSCHECK_MODEL") : null,
    },
    attestationTtlSeconds: deps.config.attestationTtl,
    statusTtlSeconds: deps.config.statusTtl,
    retention: null,
    authentication: "development-token",
    onChainSubmission: "browser-wallet",
    explorerUrl: process.env.MIDNIGHT_EXPLORER_URL || null,
  };
  return { deps, metrics, publicConfig };
}

const holder = globalThis as { __ciphercomplyGateway?: Gateway };

/** @throws NotConfiguredError if required configuration is missing. */
export function getGateway(): Gateway {
  holder.__ciphercomplyGateway ??= build();
  return holder.__ciphercomplyGateway;
}
