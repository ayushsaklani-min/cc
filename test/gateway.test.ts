// /v1/verify status-code contract (spec 8) and the pre-signing invariants.
// The extractor is a stub; everything else is the real implementation, and
// issued attestations are redeemed against the compiled contract in the simulator.
import { describe, expect, it } from "vitest";
import { openDatabase } from "../lib/db.ts";
import { DocumentRegistry } from "../lib/document-registry.ts";
import type { Extraction, Extractor } from "../lib/extraction-schema.ts";
import {
  deserializeIssued,
  handleStatus,
  handleVerify,
  sniffMimeType,
  type GatewayDeps,
  type GatewayResponse,
  type Session,
  type VerifyRequest,
} from "../lib/gateway.ts";
import { IdempotencyStore } from "../lib/idempotency.ts";
import { encodeSignature, type OracleSignature } from "../lib/oracle-signer.ts";
import { SqliteRateLimiter } from "../lib/rate-limit.ts";
import { ChallengeStore, proveSubjectOwnership, type OwnershipProof } from "../lib/subject-ownership.ts";
import { bytes, T0, World } from "./harness.ts";
import { extraction as baseExtraction, POLICY } from "./fixtures.ts";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const be32 = (x: bigint) => x.toString(16).padStart(64, "0");
// The simulator's clock (T0) is not today's date, so documents are dated relative to it.
const RECENT = new Date((T0 - 5 * 86_400) * 1000).toISOString().slice(0, 10);
const extraction = (o: Partial<Extraction> = {}) =>
  baseExtraction({ documentDate: RECENT, periodStart: RECENT, periodEnd: RECENT, ...o });
const pdf = (content: string) => new TextEncoder().encode(`%PDF-1.7\n${content}`);

const ALICE: Session = { principal: "acct-alice", identity: { method: "govIdCamera", verifiedName: "Maria Jose Garcia" } };
const BOB: Session = { principal: "acct-bob", identity: { method: "govIdCamera", verifiedName: "Maria Jose Garcia" } };

class Rig {
  readonly world = new World();
  readonly db = openDatabase(":memory:");
  readonly registry = new DocumentRegistry(this.db);
  readonly challenges = new ChallengeStore(this.db, 300);
  readonly idempotency = new IdempotencyStore(this.db);
  readonly logs: string[] = [];
  now = T0;
  signCount = 0;
  extracted: Extraction | Error = extraction();
  revoked = new Map<string, bigint>();
  private keyCounter = 0;

  readonly deps: GatewayDeps = {
    config: {
      domain: this.world.domain,
      policyId: this.world.policyId,
      contractAddress: this.world.addressBytes,
      policy: POLICY,
      maxDocumentBytes: 1024,
      attestationTtl: 900,
      statusTtl: 86_400,
      fingerprintKey: bytes(32, 0xf1),
    },
    authenticate: async (authorization) =>
      authorization === "Bearer alice" ? ALICE : authorization === "Bearer bob" ? BOB : undefined,
    challenges: this.challenges,
    idempotency: this.idempotency,
    rateLimiter: new SqliteRateLimiter(this.db, { perWindow: 20, windowSeconds: 60, perMonth: 100 }),
    registry: this.registry,
    extractor: {
      id: "stub-a",
      extract: async () => {
        if (this.extracted instanceof Error) throw this.extracted;
        return this.extracted;
      },
    } satisfies Extractor,
    signer: {
      publicKey: this.world.oracle.publicKey,
      sign: async (digest) => {
        this.signCount += 1;
        return this.world.oracle.signSync(digest);
      },
    },
    chain: {
      revokedAt: async (subject) => this.revoked.get(hex(subject)),
      verifiedUntil: async (subject) =>
        this.world.ledger.verifiedUntil.member(subject) ? this.world.ledger.verifiedUntil.lookup(subject) : undefined,
    },
    logger: {
      info: (event, fields) => this.logs.push(JSON.stringify({ event, ...fields })),
      error: (event, fields) => this.logs.push(JSON.stringify({ event, ...fields })),
    },
    now: () => this.now,
  };

  /** A complete, honest request from `session` for the subject behind `userSecret`. */
  request(o: { session?: Session; userSecret?: Uint8Array; document?: Uint8Array; proof?: OwnershipProof } = {}): VerifyRequest {
    const session = o.session ?? ALICE;
    const secret = o.userSecret ?? this.world.userSecret;
    const subject = this.world.subjectOf(secret);
    const proof =
      o.proof ??
      proveSubjectOwnership(this.deps.config, secret, this.challenges.issue(session.principal, subject, this.now).serverNonce);
    this.keyCounter += 1;
    return {
      authorization: session === ALICE ? "Bearer alice" : "Bearer bob",
      idempotencyKey: `idem-key-${this.keyCounter}`,
      clientIp: "203.0.113.7",
      subjectHex: hex(proof.subject),
      ownerKeyHex: be32(proof.ownerKey.x) + be32(proof.ownerKey.y),
      serverNonceHex: hex(proof.serverNonce),
      ownershipSignatureHex: hex(encodeSignature(proof.signature)),
      document: o.document ?? pdf("payslip september"),
    };
  }

  verify(req: VerifyRequest): Promise<GatewayResponse> {
    return handleVerify(this.deps, req);
  }
}

const attestationOf = (r: GatewayResponse) => deserializeIssued(r.body.attestation as Record<string, unknown>);

describe("POST /v1/verify", () => {
  it("201: issues an attestation that the compiled contract accepts", async () => {
    const rig = new Rig();
    const r = await rig.verify(rig.request());

    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: "eligible", verificationMethod: { method: "govIdCamera", assurance: 3 } });
    expect(r.body.attestation).toMatchObject({
      assuranceLevel: 3,
      amountMinorUnits: "9000000",
      currency: "USD",
      issuedAt: String(T0),
      expiresAt: String(T0 + 900),
    });
    expect((r.body.attestation as { signatureHex: string }).signatureHex).toHaveLength(192);

    const { attestation, signature } = attestationOf(r);
    rig.world.submit(attestation, signature);
    expect(rig.world.ledger.verifiedUntil.lookup(rig.world.subject)).toBe(BigInt(T0 + 86_400));
    expect(await handleStatus(rig.deps, hex(rig.world.subject))).toEqual({
      status: 200,
      body: { verified: true, validUntil: String(T0 + 86_400) },
    });
  });

  it("401: missing or invalid session", async () => {
    const rig = new Rig();
    for (const authorization of [undefined, "Bearer mallory"]) {
      const r = await rig.verify({ ...rig.request(), authorization });
      expect(r).toMatchObject({ status: 401, body: { error: "unauthenticated" } });
    }
    expect(rig.signCount).toBe(0);
  });

  it("400: malformed or missing fields, including Idempotency-Key", async () => {
    const rig = new Rig();
    const cases: Partial<VerifyRequest>[] = [
      { subjectHex: "zz" },
      { subjectHex: undefined },
      { ownerKeyHex: "00" },
      { serverNonceHex: "abcd" },
      { ownershipSignatureHex: undefined },
      { idempotencyKey: undefined },
      { idempotencyKey: "short" },
      { document: undefined },
      { document: new Uint8Array() },
    ];
    for (const override of cases) {
      const r = await rig.verify({ ...rig.request(), ...override });
      expect(r.status, JSON.stringify(Object.keys(override))).toBe(400);
      expect(r.body.error).toBe("malformed_request");
    }
    expect(rig.signCount).toBe(0);
  });

  describe("403: caller does not own the claimed subject (never signed)", () => {
    const victimSecret = bytes(32, 0x11);
    const attackerSecret = bytes(32, 0x66);

    const expectForbidden = async (rig: Rig, req: VerifyRequest) => {
      const r = await rig.verify(req);
      expect(r).toMatchObject({ status: 403, body: { error: "subject_ownership_failed" } });
      expect(rig.signCount).toBe(0);
      expect(rig.registry.pendingSettlement()).toEqual([]);
    };

    it("victim's subject with the attacker's own key and signature", async () => {
      const rig = new Rig();
      const victim = rig.world.subjectOf(victimSecret);
      const nonce = rig.challenges.issue(BOB.principal, victim, rig.now).serverNonce;
      const own = proveSubjectOwnership(rig.deps.config, attackerSecret, nonce);
      await expectForbidden(rig, rig.request({ session: BOB, proof: { ...own, subject: victim } }));
    });

    it("victim's subject and victim's public key, signed by the attacker", async () => {
      const rig = new Rig();
      const victim = rig.world.subjectOf(victimSecret);
      const nonce = rig.challenges.issue(BOB.principal, victim, rig.now).serverNonce;
      const honest = proveSubjectOwnership(rig.deps.config, victimSecret, nonce);
      const forged = proveSubjectOwnership(rig.deps.config, attackerSecret, nonce);
      await expectForbidden(rig, rig.request({ session: BOB, proof: { ...honest, signature: forged.signature } }));
    });

    it("a proof captured from another account's challenge", async () => {
      const rig = new Rig();
      const aliceRequest = rig.request({ session: ALICE }); // challenge issued to Alice
      await expectForbidden(rig, { ...aliceRequest, authorization: "Bearer bob" });
    });

    it("a nonce the server never issued, and an expired challenge", async () => {
      const rig = new Rig();
      const selfIssued = proveSubjectOwnership(rig.deps.config, victimSecret, bytes(32, 0x00));
      await expectForbidden(rig, rig.request({ proof: selfIssued }));

      const req = rig.request();
      rig.now += 301;
      await expectForbidden(rig, req);
    });

    it("a proof for a different contract, domain or policy", async () => {
      const rig = new Rig();
      const subject = rig.world.subject;
      const nonce = rig.challenges.issue(ALICE.principal, subject, rig.now).serverNonce;
      const otherDomain = proveSubjectOwnership({ ...rig.deps.config, domain: bytes(32, 0x09) }, victimSecret, nonce);
      await expectForbidden(rig, rig.request({ proof: otherDomain }));
      const otherContract = proveSubjectOwnership({ ...rig.deps.config, contractAddress: bytes(32, 0x09) }, victimSecret, nonce);
      await expectForbidden(rig, rig.request({ proof: otherContract }));
    });

    it("garbage curve points and a tampered signature", async () => {
      const rig = new Rig();
      const req = rig.request();
      await expectForbidden(rig, { ...req, ownerKeyHex: be32(1n) + be32(2n) });
      await expectForbidden(rig, { ...req, ownerKeyHex: be32(0n) + be32(1n) }); // identity
      const sig: OracleSignature = { announcement: { x: 0n, y: 1n }, response: 0n };
      await expectForbidden(rig, { ...req, ownershipSignatureHex: hex(encodeSignature(sig)) });
    });
  });

  it("413 and 415: size limit and magic bytes, regardless of what the client claims", async () => {
    const rig = new Rig();
    const big = await rig.verify(rig.request({ document: pdf("x".repeat(2000)) }));
    expect(big).toMatchObject({ status: 413, body: { error: "document_too_large" } });
    const exe = await rig.verify(rig.request({ document: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) }));
    expect(exe).toMatchObject({ status: 415, body: { error: "unsupported_document_type" } });
    expect(rig.signCount).toBe(0);

    expect(sniffMimeType(pdf(""))).toBe("application/pdf");
    expect(sniffMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMimeType(new TextEncoder().encode("<html>"))).toBeUndefined();
  });

  it("422: ineligible and review verdicts carry a reason code and are never signed", async () => {
    const rig = new Rig();
    rig.extracted = extraction({ amountMinorUnits: 100_000n });
    const low = await rig.verify(rig.request());
    expect(low).toMatchObject({ status: 422, body: { status: "ineligible", reason: "below_threshold" } });

    rig.extracted = extraction({ ambiguous: true });
    const unclear = await rig.verify(rig.request({ document: pdf("other") }));
    expect(unclear).toMatchObject({ status: 422, body: { status: "review", reason: "ambiguous_extraction" } });

    expect(rig.signCount).toBe(0);
    expect(rig.registry.pendingSettlement()).toEqual([]);
  });

  it("422: a revoked subject is refused", async () => {
    const rig = new Rig();
    rig.revoked.set(hex(rig.world.subject), BigInt(T0 - 10));
    const r = await rig.verify(rig.request());
    expect(r).toMatchObject({ status: 422, body: { reason: "subject_revoked" } });
    expect(rig.signCount).toBe(0);
  });

  it("idempotency: same key and body replays; same key with a different body is 422", async () => {
    const rig = new Rig();
    const req = rig.request();
    const first = await rig.verify(req);
    const replay = await rig.verify(req);
    expect(first.status).toBe(201);
    expect(replay).toEqual({ status: 201, body: first.body });
    expect(rig.signCount).toBe(1);

    const reused = await rig.verify({ ...req, document: pdf("a different document") });
    expect(reused).toMatchObject({ status: 422, body: { error: "idempotency_key_reuse" } });
    expect(rig.signCount).toBe(1);
  });

  it("409: a document already claimed by another subject", async () => {
    const rig = new Rig();
    const document = pdf("shared payslip");
    expect((await rig.verify(rig.request({ document }))).status).toBe(201);

    const second = await rig.verify(rig.request({ session: BOB, userSecret: bytes(32, 0x22), document }));
    expect(second).toMatchObject({ status: 409, body: { error: "document_already_claimed" } });
    expect(rig.signCount).toBe(1);
  });

  it("the same subject re-uploading gets the original attestation back, then 422 once it has expired", async () => {
    const rig = new Rig();
    const document = pdf("my payslip");
    const first = await rig.verify(rig.request({ document }));
    const again = await rig.verify(rig.request({ document })); // new Idempotency-Key
    expect(again.status).toBe(201);
    expect(again.body.attestation).toEqual(first.body.attestation);
    expect(rig.signCount).toBe(1);

    rig.now += 900;
    const late = await rig.verify(rig.request({ document }));
    expect(late).toMatchObject({ status: 422, body: { reason: "attestation_expired" } });
    expect(rig.signCount).toBe(1);
  });

  it("crash after signing, before the response: the document is not re-earnable", async () => {
    const rig = new Rig();
    const document = pdf("crash payslip");
    const req = rig.request({ document });

    // The process dies after the ISSUED row commits but before the response is stored or sent.
    const complete = rig.idempotency.complete.bind(rig.idempotency);
    rig.idempotency.complete = () => {
      throw new Error("simulated crash");
    };
    expect((await rig.verify(req)).status).toBe(500);
    rig.idempotency.complete = complete;

    expect(rig.signCount).toBe(1);
    const pending = rig.registry.pendingSettlement();
    expect(pending).toHaveLength(1);

    // The client retries with the same key: it receives the attestation that was signed, not a new one.
    const retry = await rig.verify(req);
    expect(retry.status).toBe(201);
    expect(rig.signCount).toBe(1);
    expect((retry.body.attestation as { nonce: string }).nonce).toBe(pending[0]?.nonce);

    // Nobody else can earn from it either, and the recovered attestation still redeems.
    const thief = await rig.verify(rig.request({ session: BOB, userSecret: bytes(32, 0x22), document }));
    expect(thief.status).toBe(409);
    const { attestation, signature } = attestationOf(retry);
    rig.world.submit(attestation, signature);
    expect(rig.world.ledger.usedNullifiers.size()).toBe(1n);
  });

  it("500: a technical failure is generic, leaks nothing, and can be retried with the same key", async () => {
    const rig = new Rig();
    const req = rig.request();
    rig.extracted = new Error("model said: holder Maria Jose Garcia earns 7,500");
    const failed = await rig.verify(req);
    expect(failed.status).toBe(500);
    expect(Object.keys(failed.body).sort()).toEqual(["correlationId", "error"]);
    expect(failed.body.error).toBe("verification_failed");
    expect(rig.signCount).toBe(0);

    rig.extracted = extraction();
    expect((await rig.verify(req)).status).toBe(201);
  });

  it("429: rate limit", async () => {
    const rig = new Rig();
    rig.deps.rateLimiter = new SqliteRateLimiter(rig.db, { perWindow: 1, windowSeconds: 60, perMonth: 100 });
    expect((await rig.verify(rig.request({ document: pdf("one") }))).status).toBe(201);
    const limited = await rig.verify(rig.request({ document: pdf("two") }));
    expect(limited).toMatchObject({ status: 429, body: { error: "rate_limited" } });
    expect(rig.signCount).toBe(1);
  });

  it("logs carry a correlation id and no personal data, content or secrets", async () => {
    const rig = new Rig();
    const ok = await rig.verify(rig.request({ document: pdf("SECRET-DOCUMENT-CONTENT") }));
    rig.extracted = new Error("SECRET-MODEL-TEXT Maria");
    await rig.verify(rig.request({ document: pdf("another") }));

    const all = rig.logs.join("\n");
    expect(rig.logs.length).toBeGreaterThanOrEqual(2);
    for (const line of rig.logs) expect(JSON.parse(line)).toHaveProperty("correlationId");
    for (const secret of ["Maria", "Garcia", "SECRET", "acct-alice", hex(rig.world.subject), "203.0.113.7"]) {
      expect(all).not.toContain(secret);
    }
    expect(all).not.toContain((ok.body.attestation as { signatureHex: string }).signatureHex);
  });
});

describe("GET /v1/status/{subject}", () => {
  it("404 when nothing is registered, 400 on a malformed subject, verified=false after expiry", async () => {
    const rig = new Rig();
    expect((await handleStatus(rig.deps, hex(rig.world.subject))).status).toBe(404);
    expect((await handleStatus(rig.deps, "xyz")).status).toBe(400);

    const { attestation, signature } = attestationOf(await rig.verify(rig.request()));
    rig.world.submit(attestation, signature);
    rig.now = T0 + 86_400;
    expect(await handleStatus(rig.deps, hex(rig.world.subject))).toEqual({
      status: 200,
      body: { verified: false, validUntil: String(T0 + 86_400) },
    });
  });
});
