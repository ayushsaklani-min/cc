# Privacy boundary

Source: specification v5, sections 1, 3 and 7.

## What is public

Every ledger field and every disclosed circuit value is public, permanently.

| Data | Where | Notes |
|---|---|---|
| Oracle public key, key id, policy id, domain, minimum assurance, admin hash | Ledger | Trust anchors |
| Subject | Ledger | Pseudonymous and persistent: a hash of the contract address and the public key of the user's secret |
| `statusValidUntil` per subject | Ledger | For downstream expiry checks |
| Used-attestation nullifier | Ledger | Hash of the contract address and the attestation nonce |
| `revokedAt` per subject | Ledger | Revocation epoch |
| `expiresAt` | Transaction transcript | **Deviation from the spec.** The chain-time check forces this bound to be disclosed. It equals issuance time + 15 minutes, so it reveals approximately when the attestation was issued. |

## What stays off the ledger

| Data | Handling |
|---|---|
| Raw document, income, tax figures | Off-chain. In server-mediated mode the gateway and the AI provider both see plaintext. |
| Attestation fields other than those above (amount, currency, assurance level, issued-at, nonce, document hash) | Private witness. Never disclosed by the circuit. |
| Oracle signature | Private witness |
| User secret | Never leaves the client. The gateway sees only the derived owner public key. |

## What the operator can see and link

The oracle is a privacy-trusted party. It can link an authenticated account, a
subject, the owner public key and the document. Raw evidence is off-ledger; it
is **not** off the server or off the AI provider. Only a TEE-backed or
on-device mode removes that exposure; neither is built. End-to-end encryption
combined with server-side AI is contradictory and is not offered.

## The AI provider's terms

The income policy sends the document to the Gemini API. Under Google's
additional terms for the Gemini API, content sent through unpaid (free-tier)
services may be used to improve Google's products and may be read by human
reviewers; content sent through paid services is not used for that. The hosted
demo uses a free-tier key. The deployment reports its tier in its public config
(`processing.providerDataUse`, set by `GEMINI_DATA_USE`), and the disclosure
shown before upload says what it means. Anything other than an explicit "paid"
is described as the free tier.

## Storage and logs

- The document registry stores an HMAC of the document under a server-only key,
  never a bare document hash, alongside the subject and the issued attestation.
- Logs carry an event name, a correlation id and a status. They do not carry
  names, document content, model output, subjects, IP addresses, account ids,
  signatures or exception text (`gateway.test.ts` checks this).
- Clients receive reason codes, never raw error text.
- Retention periods for documents, registry rows and idempotency records are
  not yet defined. A retention policy is required before any real data is handled.

## The signed-record policy (aged 18 or over)

- The uploaded PAN Verification Record goes to the gateway only. It is not sent
  to a model or to any other service.
- The gateway reads the PAN, the name and the date of birth in order to check
  the signature and the age. None of the three is returned to the client,
  written to the registry, logged, or placed in the attestation.
- The registry stores an HMAC of the PAN under the server-only key, so the same
  person cannot verify a second subject. It does not store the PAN or the file.
- The attestation carries no amount (0, currency `XXX`). On-chain the result is
  the same shape as for any policy: a pseudonymous subject, a validity date and
  a nullifier.
- A relying application learns that the subject met the over-18 policy. It does
  not learn the age, the date of birth or the PAN.
