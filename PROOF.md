# Proof

What CipherComply has actually done on the Midnight Preview network, and how to
re-check every line of it yourself without a wallet, secrets or an account.

## Re-check it

```
npm ci
npm run verify:onchain
```

The script reads the public Midnight indexer and compares it, field by field,
with `evidence/onchain.json`. Last run: **35 checks passed, 0 failed**. It also
runs in CI as the `onchain-evidence` job.

## Contract

| | |
|---|---|
| Network | Midnight Preview |
| Address | [`f414a418e7f7878e1ac7103954084cd1454fdc201bc6c799e17e0dbb39b322df`](https://preview.midnightexplorer.com/contracts/f414a418e7f7878e1ac7103954084cd1454fdc201bc6c799e17e0dbb39b322df) |
| Source | `contracts/ciphercomply.schnorr.compact` |
| Compiler | Compact 0.31.1 (pinned and checksum-verified in CI) |
| Sealed at deployment | domain `ciphercomply:preview:v1`, policy `income-usd-85k:v1`, minimum assurance 2 |

## Transactions

| What happened | Transaction | Block |
|---|---|---|
| Contract deployed | [`8b137e6f…33bd199f`](https://preview.midnightexplorer.com/transactions/0x8b137e6f082ca9c617d442d67cffa99007b49c8b850f05ad6ab387b933bd199f) | 1221482 |
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

## Tests

- 179 offline tests pass (7 need a live proof server or model and are skipped):
  contract simulator, signature golden vectors, policy engine, registry,
  gateway, HTTP layer, the example relying app and the sandbox scenarios.
- CI runs on every push: clean install, dependency audit, secret scan, compile
  with the pinned compiler, typecheck, tests, and the on-chain evidence check.

## Not yet demonstrated

- Oracle key rotation on-chain (the circuit exists and is tested offline).
- Node-side rejection of an invalid proof.
- Anything on Preprod or Mainnet.
- An independent audit.
