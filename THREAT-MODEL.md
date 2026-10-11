# Threat model

Source: specification v5, section 4. "Tested" names the test that exercises the
mitigation; "simulator" means the compiled contract run in the runtime VM, not
a proof verified on a chain. Nothing in this table has been exercised on a
public network yet.

## Trust assumptions

- **The oracle decides eligibility.** The circuit proves only that a valid,
  fresh, unused attestation from the authorized oracle exists for the caller's
  subject, policy and domain.
- **Zero knowledge does not prove the document is genuine**, belongs to the
  subject, or was read correctly by the model. A deceived or compromised
  extraction yields a valid proof of invalid data. This is the system's primary
  residual risk. It is accepted and documented, not closed.
- **The oracle is privacy-trusted.** It sees plaintext and can link subjects to
  documents.
- **The Schnorr verification is composed in this repository** from ledger-8
  curve builtins, because the standard-library verifier does not exist on
  ledger 8 (SPIKE-REPORT.md, D-1). It has had no independent review.

## Threats and mitigations

| Threat | Mitigation | Tested |
|---|---|---|
| Payload tampering | Digest recomputed in-circuit over every field; signature over that digest | `contract.test.ts`: tampered field x13, modified witness fields |
| Cross-user substitution at redemption | Subject derived in-circuit from the caller's secret and compared with the signed subject | `contract.test.ts`: wrong subject |
| Cross-user substitution at signing | Gateway verifies a signature under the key the subject is derived from, over a server challenge, before the oracle signs | `gateway.test.ts`: 403 cases |
| Cross-contract / cross-network replay | `domain` is signed and asserted; subject and nullifier include the contract address; the ownership challenge includes domain and policy | `contract.test.ts`: wrong domain; `gateway.test.ts`: other contract/domain |
| Replay of one attestation | Nullifier from the nonce, consumed on-chain | `contract.test.ts`: replay |
| Stale attestation | `expiresAt` checked against chain time with `blockTimeLt`; CI fails if the assertion is missing | `contract.test.ts`: expiry; `check-expiry-assertion.mjs` |
| Stale status | `statusValidUntil` stored on-chain; `GET /v1/status` compares it with now | `gateway.test.ts`: status |
| Revoked-then-resurrected | Attestations issued before `revokedAt[subject]` are rejected; the oracle refuses revoked subjects | `contract.test.ts`, `gateway.test.ts` |
| Inconsistent revocation epoch | `revokeSubject` is monotonic and cannot be dated after chain time | `contract.test.ts`: revokeSubject |
| Backward status overwrite | `verifiedUntil` can only move forward | `contract.test.ts`: status monotonicity |
| Forged assurance tier | `assuranceLevel` is inside the signed attestation and checked against `minAssurance` | `contract.test.ts` |
| Document re-earned after a crash, or by another subject | ISSUED registry rows are durable and stay bound to their subject for good; the same subject gets a replacement only once the earlier attestation has expired plus a grace period | `stores.test.ts`, `gateway.test.ts`: crash after signing, replacement after expiry |
| Idempotency confusion | Key bound to principal + endpoint + request hash | `stores.test.ts`, `gateway.test.ts` |
| Float threshold or rounding error | Integer minor units end to end | `money.test.ts`, `policy.test.ts` |
| Wrong policy | `policyId` signed and asserted | `contract.test.ts` |
| Rogue or compromised oracle key | Mutable key, admin-gated rotation, key id; small-order keys rejected | `contract.test.ts`: rotateOracleKey |
| Oracle collusion | Not addressable in-circuit. Governance, audit logging, cross-checks | Not tested; process |
| Forged or borrowed document | Holder-name match, issuer allow-list, document uniqueness, manual review | `policy.test.ts`; residual risk remains |
| Hallucination / prompt injection | Strict schema, deterministic policy, evidence required, ambiguity to review, independent cross-check | `policy.test.ts`; no adversarial corpus yet |
| Under-constrained circuit | Every witness value is constrained by an assertion or the signature | Tamper tests only; no dedicated scan, no external review |
| Endpoint abuse | Session, rate limits, monthly quota, size limit, magic-byte sniffing | `gateway.test.ts`, `stores.test.ts` |
| Fake UI confirmation | Only finalized, indexed chain state may drive "confirmed" | Frontend not built |

## Known gaps

- Node-side rejection of an invalid proof is untested: every refusal observed so far was produced by
  local circuit execution before submission.
- **Signed records are bearer documents.** The over-18 policy verifies that DigiLocker signed exactly
  these bytes. It does not verify that the uploader is the person named in the record. Anyone who obtains
  someone's signed record can use it once; the keyed PAN fingerprint then blocks every later use, including
  by the real holder.
- **Issuer trust is a pinned leaf certificate** (`trust/document-signers.json`), not a chain validated to
  the Indian root authority, and revocation of that certificate is not checked. A compromised or rotated
  issuer key needs a manual update.
- **The PDF signature verifier is written in this repository** (a minimal DER reader and CMS checks in
  `lib/signed-pdf.ts`). It accepts one narrow shape and refuses the rest, but it has not been reviewed.
- The server sees the full PAN record. It stores a keyed fingerprint of the PAN, not the PAN, and does not
  store the document; nothing technical prevents an operator from logging it.
- The admin is a single secret (prototype-grade, as the spec notes).
- No KMS or HSM signs Jubjub Schnorr natively; production custody design is open.
- A hosted demo (`CIPHERCOMPLY_DEMO_MODE=preview-demo`, Preview network only) keeps the oracle key in the
  host's environment variables and authenticates with a shared bearer token. Anyone holding that token can
  submit documents and consume the extraction quota; anyone with access to the host can sign attestations.
