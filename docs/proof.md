# Proof

What CipherComply has actually done on the Midnight Preview network, and how to
re-check every line of it yourself without a wallet, secrets or an account.

## Re-check it

```
npm ci
npm run verify:onchain
```

The script reads the public Midnight indexer and compares it, field by field,
with the files in `evidence/`. Last run: **55 checks passed, 0 failed** (35 for
the income contract, 20 for the over-18 contract). It also runs in CI as the
`onchain-evidence` job.

## Contracts

Each policy is sealed into its own instance of the same compiled contract.

### Income of at least USD 85,000

| | |
|---|---|
| Network | Midnight Preview |
| Address | [`f414a418e7f7878e1ac7103954084cd1454fdc201bc6c799e17e0dbb39b322df`](https://preview.midnightexplorer.com/contracts/f414a418e7f7878e1ac7103954084cd1454fdc201bc6c799e17e0dbb39b322df) |
| Source | `contracts/ciphercomply.schnorr.compact` |
| Compiler | Compact 0.31.1 (pinned and checksum-verified in CI) |
| Sealed at deployment | domain `ciphercomply:preview:v1`, policy `income-usd-85k:v1`, minimum assurance 2 |

### Aged 18 or over

| | |
|---|---|
| Address | [`f83caf8a6c4bc962ff396efca36732010641e967f7d57dc9768d7dcb65cca9dc`](https://preview.midnightexplorer.com/contracts/f83caf8a6c4bc962ff396efca36732010641e967f7d57dc9768d7dcb65cca9dc) |
| Sealed at deployment | domain `ciphercomply:preview:v1`, policy `age-over-18:v1`, minimum assurance 2 |
| Evidence accepted | DigiLocker's PAN Verification Record, verified by issuer signature |

## Transactions

| What happened | Transaction | Block |
|---|---|---|
| Over-18 contract deployed | [`d90e2d3d…9b4727f0`](https://preview.midnightexplorer.com/transactions/0xd90e2d3d3bd49845fdcf054acb3852c2057d2de15389881b005b40829b4727f0) | 1250246 |
| Attestation settled on the over-18 contract (end-to-end test) | [`317d4d74…8a04e0e4`](https://preview.midnightexplorer.com/transactions/0x317d4d7411ab3a286a247b3c2986b4b13b7821bfb7d09d82580c37018a04e0e4) | 1250264 |
| Income contract deployed | [`8b137e6f…33bd199f`](https://preview.midnightexplorer.com/transactions/0x8b137e6f082ca9c617d442d67cffa99007b49c8b850f05ad6ab387b933bd199f) | 1221482 |
| Attestation settled, command-line wallet (end-to-end run) | [`bd1f405d…b8500cd8`](https://preview.midnightexplorer.com/transactions/0xbd1f405da46f3f3dc68264bd670afd8d19e7bcda6be1e2ea95229ee4b8500cd8) | 1225891 |
| Subject revoked by the admin (end-to-end run) | [`fe6e9559…255a0fc5`](https://preview.midnightexplorer.com/transactions/0xfe6e95599174284095ef8a4397501ffe65ac0be2cbb52560f6e7808c255a0fc5) | 1225895 |
| Attestation settled, Lace browser wallet (the recorded demo) | [`4b5672b5…fa4339be`](https://preview.midnightexplorer.com/transactions/0x4b5672b553fcb4e83b5e20f1af95f448f4553e977dda29f304c4adc2fa4339be) | 1247229 |

## Ledger state when recorded

- 4 subjects verified, 1 subject revoked, 5 nullifiers used.
- The revoked subject has no status left, and its revocation epoch is recorded.
- Every status was created by a distinct, single-use attestation.

A subject is a pseudonymous identifier. Nothing on the ledger is a name, an
income, a document, a document hash or a wallet address.

## What the contract refuses

These are the product. Each row was produced by `npm run e2e:full` against the
deployed contract, using a validly formed transaction that should not succeed.

| Attempt | Contract's answer |
|---|---|
| Redeem an attestation with another user's secret | `Subject mismatch` |
| Change the amount or validity of a signed attestation | `Invalid oracle signature` |
| Sign with a key that is not the registered oracle | `Invalid oracle signature` |
| Validly signed, assurance below the policy minimum | `Assurance below policy minimum` |
| Validly signed, but the result is "not eligible" | `Not eligible` |
| Validly signed, already expired | `Attestation expired` |
| Replay an attestation that has settled | `Attestation already used` |
| Use a new attestation to shorten an existing status | `Status would move backward` |
| Revoke without the admin secret | `Not admin` |
| Revoke with a date in the future | `Revocation in the future` |
| Redeem an attestation issued before a revocation | `Issued before revocation` |
| Move a revocation epoch backward | `Revocation epoch moved backward` |

You can reproduce the contract refusals yourself, without a wallet, in the
[sandbox](https://ciphercomply.vercel.app/sandbox), which runs the same compiled
contract in your browser.

**Limit of this evidence:** every refusal was produced by executing the circuit
locally against indexed chain state, before submission. That is how Midnight
transactions are built: a proof that cannot be constructed is never sent. The
node-side rejection of a hand-forged proof has not been tested.

The gateway refuses earlier still, before anything is signed:

| Attempt | Gateway's answer |
|---|---|
| Ask for an attestation for a subject you do not control | 403 `subject_ownership_failed` |
| Upload something that is not a PDF, PNG or JPEG | 415 `unsupported_document_type` |
| Income below the threshold | 422 `ineligible` / `below_threshold` |
| Name on the document does not match the signed-in person | 422 `ineligible` / `holder_name_mismatch` |
| Document older than 90 days | 422 `ineligible` / `document_stale` |
| Issuer not on the allow-list | 422 `ineligible` / `issuer_not_allowed` |
| Reuse a document that already produced an attestation | 409 `document_already_claimed` |
| Ask for an attestation for a revoked subject | 422 `ineligible` / `subject_revoked` |

## What the signed-document check refuses

For the over-18 policy the gateway believes nothing in a document until the
issuer's signature verifies. Each row is a test in `test/signed-pdf.test.ts` or
`test/http.test.ts`.

| Attempt | Answer |
|---|---|
| A PDF with no digital signature, however convincing its text | `document_not_signed` |
| The date of birth edited inside a genuinely signed record | `signature_invalid` |
| Bytes appended after the signature | `signature_invalid` |
| A byte range that leaves part of the file unsigned | `signature_invalid` |
| A signature value copied from a different signed document | `signature_invalid` |
| Validly signed, by an issuer that is not pinned | `signer_not_trusted` |
| Validly signed by the right issuer, but a different kind of document | `not_a_pan_record` |
| A genuine record for someone under 18 | `under_minimum_age` |
| A record signed more than 30 days ago | `document_stale` |
| The same person's record presented for a second subject | 409 `document_already_claimed` |

A real DigiLocker record was accepted through the running API, and a test
issuer's record and an unsigned payslip were refused by the same deployment.
The real record itself is not in this repository.

## Tests

- 200 offline tests pass (7 need a live proof server or model and are skipped):
  contract simulator, signature golden vectors, policy engine, registry,
  gateway, HTTP layer, signed-document verification, the example relying app
  and the sandbox scenarios.
- CI runs on every push: clean install, dependency audit, secret scan, compile
  with the pinned compiler, typecheck, tests, and the on-chain evidence check.

## Not yet demonstrated

- The over-18 policy through a browser wallet (it has settled through the
  command-line wallet only).
- Oracle key rotation on-chain (the circuit exists and is tested offline).
- Node-side rejection of an invalid proof.
- Anything on Preprod or Mainnet.
- An independent audit.
