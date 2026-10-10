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

## Storage and logs

- The document registry stores an HMAC of the document under a server-only key,
  never a bare document hash, alongside the subject and the issued attestation.
- Logs carry an event name, a correlation id and a status. They do not carry
  names, document content, model output, subjects, IP addresses, account ids,
  signatures or exception text (`gateway.test.ts` checks this).
- Clients receive reason codes, never raw error text.
- Retention periods for documents, registry rows and idempotency records are
  not yet defined. A retention policy is required before any real data is handled.
