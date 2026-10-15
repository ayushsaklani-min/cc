# Security

**Status: development preview.** This code has not been independently audited. It
runs on the Midnight Preview test network only and must not be deployed to
Mainnet in its current state. docs/proof.md lists what has settled on-chain;
docs/spike-report.md records what has and has not been verified.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not open
a public issue for anything that could affect issued attestations or keys.

## Toolchain

Versions are pinned in `toolchain.json` and `package.json` (exact, no ranges).

- Compiler **0.31.1** only. `scripts/compile.mjs` refuses any other version.
  0.31.0 is rejected because of a reported code-generation defect in which a
  range constraint could be dropped; source review cannot detect it.
- The compiler artifact checksum is recorded in `toolchain.json`. Release
  builds must install that exact artifact and must not run a floating
  `compact update`.
- `scripts/check-expiry-assertion.mjs` fails the build if the chain-time
  freshness assertion or the revocation time bound is missing or commented out.

## Secrets

| Secret | Rule |
|---|---|
| Oracle signing scalar | Server-only. Never in a browser bundle, a log, or the repository. The signer module has no HTTP surface and is called only by the gateway after the policy verdict. |
| `GEMINI_API_KEY` | Server-only |
| Registry fingerprint key | Server-only; rotating it breaks duplicate detection for existing rows |
| Admin secret | Prototype-grade single secret; production needs multisig or threshold governance with logged actions |
| User secret | Client-only; the gateway never receives it |

`.env` files are git-ignored; `.env.example` lists the variables without values.
The secret scalar in `test/golden/schnorr-v1.json` is a published test vector
and must never be used as a real key.

### Oracle key custody

No KMS or HSM product signs Schnorr over Jubjub natively. Until a custody design
is chosen, "KMS/HSM" for this key can only mean a key encrypted under a KMS key
and unwrapped inside a restricted signer process or a TEE, with access logging.
`localSchnorrSigner` holds the scalar in process memory and is for development.

## Oracle key rotation runbook (draft, untested on a network)

1. Generate a new scalar in the custody environment; derive its public key.
2. Submit `rotateOracleKey(newKey)` with the admin secret. The contract rejects
   small-order keys and increments `oracleKeyId`.
3. After the transaction is finalized, switch the signer to the new key.
   Attestations signed under the old key and not yet submitted become invalid;
   affected users must re-verify.
4. On compromise, additionally call `revokeSubject` for every subject attested
   during the exposure window, using a revocation time at or after the latest
   suspect issuance.

## Incident runbooks still to write

Provider breach; extraction false positive or false negative.
