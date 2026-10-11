# CipherComply — Phase 0 spike report

Date: 2026-10-09. Branch: `phase-0-validation`. Target: Midnight Preview, no Docker.

Every result below was produced by a command run on this machine unless it is
marked UNVERIFIED or DOCS-ONLY. "Simulator" means the compiled contract's
JavaScript executed against the on-chain runtime VM; it is not a proof and not a
chain.

## 1. Open blockers and decisions taken

Decisions taken on 2026-10-09, when you asked me to choose the best option:

- **Accepted D-1**: Schnorr verification composed from ledger-8 curve builtins.
  Compiler 0.31.1 reports `unbound identifier jubjubSchnorrVerify`
  (`secp256k1EcdsaVerify`, `keccak256`, `JubjubScalar` and `Secp256k1Point` are
  unbound too), so the spec's section-15 "verified fact" that it exists is
  wrong for the pinned stack. This contradicts "do not hand-roll Schnorr" and
  has had no independent review.
- **Accepted D-10**: the subject is derived from the public key of the user
  secret, so the gateway can verify ownership before signing (spec 5.6).
- **Accepted D-5**: `expiresAt` is public in the transaction transcript.

Still open:

1. **The Preview wallet is not funded.** A wallet exists (address below) but
   holds no tNIGHT, so nothing has been deployed or settled. The faucet step
   needs you. The deploy and end-to-end scripts typecheck but have never run.
2. **No independent review** of the composed Schnorr verification.

### On-chain results on Preview (run 2026-10-09)

The wallet was funded with 5,000 tNIGHT from the faucet (5000000000 units, one
UTXO), registered for DUST, and accrued DUST within the same run. First sync
took 5,334 s; a resumed sync from saved state took 26 s.

| Step | Result |
|---|---|
| `npm run deploy` | Contract `f414a418e7f7878e1ac7103954084cd1454fdc201bc6c799e17e0dbb39b322df`, deploy tx `0081aa756cd754b5cb9681e2d9f282971df43fdc118e76a99b5ffdf31abff635ea`, block 1221482, 23 s |
| Valid attestation (`npm run e2e`) | Settled: tx `0081b277f8e30246df9d8725eeb8251aab4f71a41a8d4071bbfe746d767a1c1516`, block 1221513, 45 s |
| Indexed ledger afterwards | `verifiedUntil[subject]` equals the attestation's value; the nullifier is present |
| Replay of the same attestation | Rejected with `failed assert: Attestation already used` |
| Attestation already expired | Rejected with `failed assert: Attestation expired` |
| `npm run api:smoke` through the web app | 9 of 9, including a real extraction (201), idempotent replay, below-threshold (422) and status (404) |

This is the first evidence that the network accepts proofs from the
source-built proof server and from the composed Schnorr verification.

Limits of this evidence: the replay and expiry rejections happened when the
transaction was executed locally against indexed chain state, before
submission. No invalid transaction was forced onto the network, so node-side
rejection is untested, and I have not established which clock the local
execution uses for the expiry check. The other matrix rows (wrong subject,
rogue key, revocation, rotation) have run only in the simulator.

A packaging fault was found and fixed on the way: npm had installed two
copies of `@midnight-ntwrk/onchain-runtime-v3` at 3.0.0, and objects from one
were rejected by the other (`expected instance of StateValue`). It is now a
direct dependency with a single hoisted copy. The first e2e run also showed
the test counting any error as a rejection; it now requires the contract's own
assertion message.

### Full end-to-end run on Preview (2026-10-10)

`npm run e2e:full` drives the whole path with the funded server wallet standing
in for a browser wallet: real `/v1/challenge` and `/v1/verify` (real Gemini
extraction and cross-check, real oracle signature), then proving and on-chain
submission, then `/v1/status`. 23 of 23 cases passed.

| Case | Result |
|---|---|
| API issues an attestation from a real extraction | 201 eligible, 10 s |
| That attestation settles on-chain | tx `007900e4a15efa5b7f4476d6c767b7e495708e33eb1f9085a46a2775fb9113c22d`, block 1225891, 44 s |
| Indexed ledger, then `/v1/status` | Subject and nullifier present; status 200 `verified=true` with the attestation's `validUntil` |
| Another user's secret | `Subject mismatch` |
| API signature reused with a modified amount or longer validity | `Invalid oracle signature` |
| Rogue oracle key | `Invalid oracle signature` |
| Validly signed, assurance below minimum | `Assurance below policy minimum` |
| Validly signed, `eligible=false` | `Not eligible` |
| Validly signed, already expired | `Attestation expired` |
| Replay after settlement | `Attestation already used` |
| New attestation that would shorten the status | `Status would move backward` |
| Revocation by a non-admin; revocation dated in the future | `Not admin`; `Revocation in the future` |
| Admin revocation | tx `007ffae0bacfde5f94eba565de966a431dc32ec3ecbde64ad6440dbbef18172634`, block 1225895, 20 s; ledger shows the epoch and no status; `/v1/status` 404 |
| Pre-revocation attestation; epoch moved backward | `Issued before revocation`; `Revocation epoch moved backward` |
| API asked to issue for the revoked subject | 422 `subject_revoked` |

The same limit applies as above: every rejection was produced by executing the
circuit locally against indexed chain state before submission. Only the two
successful transactions reached the network. Key rotation was not exercised
on-chain. This run used `gemini-2.5-flash` and `gemini-3.5-flash-lite` as
temporary overrides because the configured primary was rate-limited.

### Browser wallet flow with Lace (2026-10-10)

The complete user path ran once in Chrome with the Lace extension (connector
API 4.x) on Preview: sign in, upload `samples/1-pass.pdf`, real extraction and
attestation, "Connect wallet and submit", proof generated on the local proof
server from the browser, transaction balanced, signed and submitted by Lace,
and the page reached "Verified on Midnight". Checked independently afterwards:
`GET /v1/status/537d23b6…520db1` returned `verified: true`,
`validUntil: 1794170226`.

Two faults were found and fixed on the way: the artifact route served only one
circuit, but Midnight.js fetches every circuit's verifier key when joining;
and the indexer client's `isomorphic-ws` import does not build for browsers
(replaced through an npm override, see `vendor/isomorphic-ws`). An earlier
attempt failed at the wallet step before Lace held DUST; the wallet's own error
text was not captured for that attempt, so that cause is inferred.

This is one successful run by one user. The rejected, review, wallet-declined
and expired paths have not been exercised in the browser with a wallet.

### Gemini extraction (run 2026-10-09)

`LIVE_EXTRACTION=1 npx vitest run test/extraction.live.test.ts`: 4 of 4 passed
with `gemini-3.5-flash` as the primary model and `gemini-2.5-flash` as the
cross-check. These are observations of a model on four generated documents,
not guarantees.

| Case | Result |
|---|---|
| Monthly payslip, USD 7,500.00 | `amountMinorUnits` 750000, period `monthly`, not ambiguous; policy annualizes to 9,000,000 and returns eligible |
| Second model on the same document | Agrees within 100 basis points; verdict eligible |
| Payslip with an embedded "ignore all previous instructions" note claiming USD 95,000 | Model reported the printed figure (120000), set `ambiguous: true` and named the injection; verdict is review, not eligible |
| Payslip below the threshold | 300000; ineligible, `below_threshold` |

Model availability for this key: `gemini-3.8-flash` (the model the docs
recommend) answered once and then returned HTTP 503 repeatedly;
`gemini-2.5-pro` returns 404; `gemini-3.1-pro-preview` returns 429. The
extractor retries 429/500/503 up to three times. The cross-check model is a
different model from the same provider, which the spec's M2 allows; a different
provider would be stronger.

Structured output uses `responseJsonSchema` with the amount as a digit string.
Inline requests are limited to 14 MB of document here. That is a conservative
limit chosen in this code, not a confirmed provider limit: the documentation
page I read gives 50 MB or 1000 pages per PDF and states no separate inline
limit. The Files API path for larger documents is not implemented.

### Preview wallet

Unshielded address (fund this from the faucet):
`mn_addr_preview1aenjk9x9z6vl4959zws28f7r3ufj78uq6h5j9xtfuzj67m96v4zqgh03cu`

The seed is in the git-ignored `.env` as `MIDNIGHT_WALLET_SEED`.

First sync is slow and has not completed yet. Observed against Preview on
2026-10-09: the shielded wallet advanced between about 20 and 170 indices per
second and the DUST wallet between about 8 and 50, each out of roughly 263,500.
That puts a first sync somewhere between half an hour and several hours.
Sync state is therefore persisted to `.wallet-state/` every 60 seconds and on
exit; a restart resumed from index 10372 instead of 0. Balance, DUST
registration and total sync time are NOT yet recorded.

Written but never run, because they need a funded wallet: `npm run deploy`
(deploys Profile A and records the address) and `npm run e2e` (settles a valid
attestation, then checks that a replay and an already-expired attestation are
rejected on-chain).

## 2. Environment

| Item | Result |
|---|---|
| Host | Windows 11, Node v25.2.1, npm 11.6.2 |
| Containers | Docker CLI present, daemon not running; Podman and nerdctl absent. Not used. |
| Linux environment | WSL 2 with Ubuntu 24.04 installed for this spike (user `dev`). Existing `.wslconfig` left as it was: 6 GB RAM, 3 CPUs, 8 GB swap. |
| Compact devtools | `compact 0.5.1` |
| Compiler | `compact compile --version` → `0.31.1` |
| Compiler artifact | `compactc_v0.31.1_x86_64-unknown-linux-musl.zip`, sha256 `e291b4bab4d4e857707008f8b1c25c2b8e0c843f6c737d0ee6c0d9ac69a6bbfb` (same hash from a direct GitHub download and from the devtools-installed copy) |
| compact-runtime | 0.16.0 (npm integrity `sha512-UR8+MI5z…8prFw==`) |
| Proof server | Built from source, `midnight-ledger` tag `ledger-8.1.0` (commit `d89e0b63`), `cargo build --release -p midnight-proof-server`, 8 m 09 s. `GET /version` → `8.1.0`. Binary sha256 not pinned yet. |

The compiler has no Windows build, so `scripts/compile.mjs` forwards to WSL on
Windows and calls `compact` directly elsewhere. On Windows, `compact` on PATH is
the NTFS compression tool, not the Midnight compiler.

The README for `midnight-ledger` says the supported build is through Nix. A
plain `cargo build` worked here, but this is not the official signed image.

## 3. Proving path without Docker

The proof server runs as a plain Linux process inside WSL and is reachable from
Windows on `http://localhost:6300`.

```
GET /version          8.1.0
GET /health           {"status":"ok",...}
GET /proof-versions   ["V2"]
```

`test/proof.integration.test.ts` (run with `PROOF_SERVER_URL=http://localhost:6300`):

| Circuit | `/check` | `/prove` | Proof size | Time |
|---|---|---|---|---|
| verifyAndRegister | 200 | 200 | 4860 bytes | 15.9 s and 47.6 s on two runs |
| revokeSubject | 200 | 200 | 4508 bytes | 2.4 s to 3.2 s |
| rotateOracleKey | 200 | 200 | 4860 bytes | 2.4 s to 2.9 s |

Negative control: a `revokeSubject` witness checked against the
`verifyAndRegister` circuit is rejected (`Expected 0 inputs, received 3`).

UNVERIFIED: the proofs were generated, not verified. Verification happens when
a transaction is accepted on-chain, which has not been attempted.

## 4. Preview network

| Endpoint | Result |
|---|---|
| `https://rpc.preview.midnight.network` | `system_chain` → `Midnight Preview`; `system_version` → `1.0.400-c338b9ac` |
| `https://indexer.preview.midnight.network/api/v4/graphql` | block height 1217455, `protocolVersion` 1000300, timestamp 1791524046000 (milliseconds; 22 s behind local clock) |
| `https://midnight-tmnight-preview.nethermind.dev/` | HTTP 200 |

The endpoints match the environments page (last updated 8 Oct 2026). The node
reports 1.0.400 while the compatibility matrix lists 1.0.300 for Preview.

Preprod moved to Blockfrost endpoints that need a project token; the
Midnight-hosted Preprod endpoints shut down on 9 Oct 2026. Not configured.

Wallet funding, DUST registration and sync time: NOT DONE.

## 5. Compiler findings (0.31.1, language 0.23)

| Question | Result | Evidence |
|---|---|---|
| `persistentHash<Attestation>(a)` over the full struct | Compiles; `circuit persistentHash<T>(value: T): Bytes<32>` | Probe and contract compile; golden digest |
| `(x + 1) as Uint<32>` | Compiles. Without the cast: `expected ... Uint<32> but received Uint<0..4294967297>` | Probe |
| Chain-time primitive | `blockTimeLt`, `blockTimeGte` (stdlib) and `kernel.blockTimeLessThan`, `kernel.blockTimeGreaterThan` all compile. Argument is `Uint<64>`; docs give the unit as Unix seconds | Probes; contract compiles with keys |
| Chain-time disclosure | The compiler requires the bound to be `disclose`d: "might disclose the lower bound of the time being checked" | Compiler error on the undisclosed form |
| `jubjubSchnorrVerify` | **Unbound identifier** | Probe |
| `ed25519Verify<32>` | Not testable on 0.31.1. DOCS-ONLY for 0.35: `ed25519Verify<#n>(msg: Bytes<n>, sig: Ed25519Signature, pk: Curve25519Point)`, needs `--feature-zkir-v3` | Standard-library reference |
| Curve builtins present | `ecMul(JubjubPoint, Field)`, `ecMulGenerator(Field)`, `ecAdd`, `jubjubPointX/Y`, `constructJubjubPoint`, `hashToCurve`, `transientHash`, `slice`, `JubjubPoint` as a ledger type | Probes |
| `ecMul` scalar range | Scalars at or above the Jubjub subgroup order are rejected at runtime (`failed to decode for built-in type EmbeddedFr`) | First test run |

The simulator honours block time: `createCircuitContext(..., time)`.

## 6. Deviations from the frozen spec

| ID | Spec | This branch | Why |
|---|---|---|---|
| D-1 | `jubjubSchnorrVerify(oraclePublicKey, digest, oracleSignature())` | `schnorrVerify`: accept iff `s·G == R + c·PK`, `c = transientHash(tag, R, PK, digest)` truncated to 248 bits | The builtin does not exist on ledger 8. Construction follows the ledger-9 library verifier (read from compact-runtime 0.19.0), except the challenge is truncated instead of reduced mod the group order, because ledger 8 has no reducing cast. Security-critical; needs review. |
| D-2 | `oraclePublicKey: Bytes<32>` | `JubjubPoint` | The curve builtins take a point; no in-circuit decompression. Constructor and `rotateOracleKey` parameters change accordingly. |
| D-3 | `witness oracleSignature(): Bytes<64>` | `OracleSignature { announcement: JubjubPoint; response: Field }` | Same shape as the ledger-9 `JubjubSchnorrSignature`. |
| D-4 | `signatureHex` is 64 bytes | 96 bytes: `R.x | R.y | s`, 32-byte big-endian each | Follows D-3. |
| D-5 | Invariant 11: only subject, statusValidUntil, nullifier, revokedAt become public | `expiresAt` is also disclosed in the transaction transcript | Forced by `blockTimeLt`. `issuedAt` stays private; `expiresAt` is issuance time + 900 s, so it reveals roughly when the attestation was issued. |
| D-6 | — | Constructor and `rotateOracleKey` assert the key is not of small order (`8·PK` has `x != 0`) | Identity rejection in the library verifier only arrives in 0.35. |
| D-7 | `subjectOf`, `nullifierOf`, `adminCheck` internal | Bodies moved to exported pure circuits `subjectFor`, `nullifierFor`, `adminHashOf` taking the contract address; the internal circuits call them with `kernel.self().bytes` | Lets TypeScript run the exact circuit code. Hash inputs are unchanged. |
| D-8 | `disclose` placement | `a.subject`, the nullifier and `statusValidUntil` are disclosed once into locals | Compiler-required for ledger reads on witness-derived keys. All three are already public by design. |
| D-9 | Local devnet for "real settlement" | Preview | Per the environment constraints. |
| D-10 | `subjectOf(sk) = persistentHash([tag, self, sk])` | `subject = persistentHash({tag "cc:subject:v2", self, ownerKey})` with `ownerKey = ecMulGenerator(low 31 bytes of sk)` | Spec 5.6 is not implementable against a bare hash of a secret: a wallet signature does not prove knowledge of it, and the server cannot recompute it. With this change the gateway verifies a Schnorr signature under `ownerKey` over its challenge and recomputes the subject. The gateway learns `ownerKey`; it is not published on-chain. The user secret is effectively 248 bits. |

Choices made where the spec is silent:

| ID | Choice | Reason |
|---|---|---|
| S-1 | A concurrent request with the same Idempotency-Key and body gets `409 request_in_progress` | The status table has no code for it; replaying a response that does not exist yet is impossible. |
| S-2 | An ownership challenge stays usable until it expires (5 minutes) instead of being single-use | A retried request with the same Idempotency-Key must pass the ownership check again to be replayed. |
| S-3 | The same subject re-uploading an already attested document gets the original attestation back (201) while it is usable, `422 attestation_expired` for 120 s after it expires, and after that a replacement attestation. A different subject is refused permanently. | **Departs from the spec wording** ("ISSUED never silently expires ... the document cannot be re-earned"), by decision on 2026-10-10: read literally, a user who did not submit within 15 minutes could never use that document again. The row stays ISSUED and bound to its subject throughout; the 120 s gap covers clock difference with the chain, so two usable attestations for one document never coexist. A document can now yield more than one signed attestation over time. A settled attestation is not marked CONFIRMED in the registry yet, so a subject can also renew from the same document until it falls outside the freshness window. |
| S-4 | Any revocation on record blocks issuance for that subject | The spec says the oracle refuses revoked subjects and defines no way to lift a revocation. |
| S-5 | Without a verified name the assurance level is capped at 2, and the name check is skipped | Only a government-ID check establishes a name to match against. |
| S-6 | Model output that fails validation, and any extractor error, returns a generic 500 and is retryable with the same key | "Parse failures abort with no signature." |
| S-7 | Storage is Node's built-in SQLite | Real transactions with no extra dependency. Node still marks the module experimental; the production database is an open choice. |
| S-8 | New variables `CIPHERCOMPLY_CONTRACT_ADDRESS` and a registry fingerprint key | The subject is contract-scoped; the registry stores an HMAC, not a bare document hash. |
| S-9 | Hosted demo mode: `CIPHERCOMPLY_DEMO_MODE=preview-demo` | The development authenticator and the in-memory oracle key refuse to start when `NODE_ENV=production`. A hosted demo sets this flag to lift that refusal, and the flag is honoured only when `MIDNIGHT_NETWORK=preview`. The oracle key then sits in the host's environment and sign-in is a shared bearer token. This is a demonstration arrangement, not production authentication or key custody. |
| S-10 | Split hosting: pages-only deployment forwards `/api/*` via `BACKEND_ORIGIN` | The API runs inside the Next.js app. One deployment holds the secrets and serves the API; a second, with no secrets, serves pages and forwards API calls to it. |
| S-11 | `contracts/managed/` is committed | A hosted build has no Compact compiler. The artifacts are the output of compiler 0.31.1 for the contract in this repository; `npm run compile` regenerates them. |
| S-12 | Example relying app at `/example` with `POST /api/example/access/{challenge,check}` | Not in the spec. Shows how an application consumes a verification: the visitor signs a challenge with the key behind their subject, and the app reads that subject's on-chain status. No session is required. Its challenges are recorded under a separate principal, so they cannot be replayed at `/v1/verify`, and the reverse. The lookup runs on the same server as the gateway; a real integrator would run it on its own backend or check the status in its own contract. |

Also noted, not a code deviation: no KMS or HSM product signs Jubjub Schnorr
natively. "Private key held in KMS/HSM" (spec 6) will mean an envelope-encrypted
key unwrapped inside a restricted signer process or a TEE.

## 7. What is built

| Path | Content |
|---|---|
| `contracts/ciphercomply.schnorr.compact` | Profile A with the expiry assertion and the revocation time bound active |
| `lib/oracle-signer.ts` | Schnorr signer using the contract's own pure circuits for all curve and hash work; hedged nonces; self-verifies before release; refuses negative attestations |
| `lib/subject-ownership.ts` | Server challenge store, ownership verification, and the client-side proof helper |
| `lib/document-registry.ts` | RESERVED -> ISSUED -> CONFIRMED state machine, one transaction per transition |
| `lib/idempotency.ts` | Key bound to principal + endpoint + canonical request hash |
| `lib/extraction-schema.ts` | Strict validator and the JSON schema for model output |
| `lib/policy-engine.ts` | Deterministic policy: allow-lists, name match, freshness, annualization, sanity bounds, cross-check, threshold |
| `lib/money.ts` | Integer minor-unit parsing, annualization, threshold compare, half-up rounding |
| `lib/rate-limit.ts` | Per-scope window limit and monthly quota |
| `lib/gateway.ts` | `POST /v1/verify` and `GET /v1/status` handlers, independent of a web framework |
| `lib/db.ts` | SQLite schema and transaction helper |
| `scripts/compile.mjs` | Compiler-version gate (exact 0.31.1) and compile |
| `scripts/check-expiry-assertion.mjs` | Build fails if either time assertion is missing or commented out |
| `test/` | 139 simulator and unit tests, 3 proof-server tests, golden vectors |
| `SECURITY.md`, `THREAT-MODEL.md`, `PRIVACY-BOUNDARY.md` | From the spec, with the deviations |

`npm run ci` (expiry gate, compile with keys, typecheck, tests): exit 0,
139 passed, 3 skipped (the proof-server tests, which need `PROOF_SERVER_URL`;
run separately they pass).

Not built: Profile B (needs compiler 0.35 and ledger 9), the Gemini client, the
chain reader, Midnight.js deployment and submission, the Next.js routes, the
frontend, metrics, and a CI workflow file.

Spec section 10 matrix:

| Test | Level | Status |
|---|---|---|
| Happy path | Simulator | Pass |
| Tamper any signed field (all 13) | Simulator | Pass |
| Reuse valid signature + modified witness fields | Simulator | Pass |
| Wrong key / rogue oracle | Simulator | Pass |
| Wrong subject | Simulator | Pass |
| Caller doesn't own claimed subject (pre-sign): 403, never signed | Gateway, 6 attack variants | Pass |
| Assurance below minimum | Simulator | Pass |
| Expired by chain time (rejects at `expiresAt`, accepts one second before) | Simulator | Pass |
| Replay | Simulator | Pass |
| Revoked-then-resurrect | Simulator | Pass |
| Revocation epoch backward; revocation dated in the future | Simulator | Pass |
| Backward status overwrite | Simulator | Pass |
| Crash after sign, before confirm | Gateway + registry, including reopening the database file | Pass |
| eligible=false | Simulator | Pass |
| Key rotation / revocation by non-admin | Simulator | Pass |
| Identity oracle key at deploy and rotation (other small-order points not tested) | Simulator | Pass |
| Public-state leakage | Simulator | Pass for ledger contents and for secrets in the transcript |
| Idempotency same-body replay vs different-body 422 | Gateway | Pass |
| Status codes 201/400/401/403/409/413/415/422/429/500 | Gateway, stub extractor | Pass |
| Gateway-issued attestation redeems in the contract | Gateway + simulator | Pass |
| Prompt-injection corpus | - | NOT BUILT |
| Real settlement | Preview | NOT DONE (no funded wallet) |
| Under-constrained scan | - | NOT DONE |

The expiry gate was checked both ways: exit 0 on the real source, exit 1 with
the assertion commented out.

## 8. Spec section 15 open items

| # | Item | Status | Evidence / blocker |
|---|---|---|---|
| 1 | Ledger-8 chain-time primitive | RESOLVED at compile, simulator and proof-generation level | `blockTimeLt(time: Uint<64>)` / `blockTimeGte`; assertion active; boundary tests pass. STILL-OPEN: behaviour on a live chain, including the node's tolerance on block time. |
| 2 | Exact signatures of `persistentHash`, `jubjubSchnorrVerify`, `ed25519Verify<32>` | PARTLY RESOLVED | `persistentHash` confirmed. `jubjubSchnorrVerify` does not exist on 0.31.1. `ed25519Verify` is docs-only; Profile B not compiled (needs compiler 0.35 and ledger 9). |
| 3 | Profile A Schnorr signing primitive matching the verifier | RESOLVED by deviation D-1 (accepted) | Signer and verifier share the compiled pure circuits; golden vectors in `test/golden/schnorr-v1.json`. |
| 4 | Gemini limits and MIME types | DOCS-ONLY | 50 MB or 1000 pages per PDF; Files API retention 48 h; 258 tokens per page; no separate inline limit stated. No extraction run. |
| 5 | Independent security audit | STILL-OPEN | Process item. D-1 raises its importance. |

Integer-money annualization: confirmed by `test/money.test.ts`, including the
one-cent-short monthly boundary.

Compiler 0.31.0 soundness bug: not independently confirmed. The 0.31.1 GitHub
release has an empty body; the docs PR describes a fix where guarded and
unguarded downcasts of the same value could be merged. The gate rejects every
version other than 0.31.1 regardless.

## 9. Next steps

1. Generate a Preview wallet; you fund it at the faucet; record balance, DUST
   registration and sync time.
2. Deploy Profile A to Preview with Midnight.js 4.1.1 and settle one
   `verifyAndRegister`; then the expiry and replay cases on-chain.
3. Chain reader over the indexer for `revokedAt` and `verifiedUntil`.
4. Gemini client behind the `Extractor` interface (needs `GEMINI_API_KEY`),
   then the prompt-injection corpus.
5. Next.js `/v1` routes, frontend lifecycle, metrics, CI workflow.
