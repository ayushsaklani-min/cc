# CipherComply

**Prove you qualify, without showing the document.**

CipherComply turns a sensitive document into a single private fact on Midnight.
A person proves "my income meets this policy"; an application learns only
"this pseudonymous ID is verified until this date". The document, the income
and the name never reach the chain.

- **Live app:** https://ciphercomply.vercel.app
- **Example of an app using it:** https://ciphercomply.vercel.app/example
- **Contract on Midnight Preview:** [`f414a418…39b322df`](https://preview.midnightexplorer.com/contracts/f414a418e7f7878e1ac7103954084cd1454fdc201bc6c799e17e0dbb39b322df)
- **Evidence, with links to every transaction:** [PROOF.md](PROOF.md)

Status: development preview on the Preview test network. Not audited. See
[Known limits](#known-limits).

## Evaluate it in five minutes

No wallet, account or secret is needed for any of this.

```
npm ci
npm run verify:onchain   # 35 checks against the public Midnight indexer
npm test                 # 159 offline tests
```

Then open the [example app](https://ciphercomply.vercel.app/example) to see
what a relying application looks like, and [PROOF.md](PROOF.md) for the list of
things the contract refuses to do.

Running a verification yourself needs a Lace wallet on Preview, test funds and
a proof server; see [Run it locally](#run-it-locally).

## How it works

1. **Submit evidence.** The user uploads a document once, after seeing exactly
   who will process it.
2. **Evaluate.** A model reads the document; fixed, versioned rules decide the
   result. The model never decides eligibility. An oracle signs the result.
3. **Prove.** The user's wallet builds a zero-knowledge proof. Inside the
   circuit, the contract checks the oracle's signature, the subject, the policy
   and the expiry.
4. **Confirm.** The transaction settles on Midnight. The ledger now holds a
   pseudonymous subject, a validity date and a one-time nullifier.

A relying application then asks one question: is this subject verified? It can
ask the status API, or have the visitor prove control of the subject first, as
the example app does.

## What is on the ledger

| On the ledger | Never on the ledger |
|---|---|
| A pseudonymous subject, specific to this contract | The document, or any hash of it |
| A validity date | The income |
| A one-time nullifier | The name |
| A revocation epoch, if revoked | The wallet address of the verified person |

The service does read the document in order to check it. Privacy here means
private from the chain and from relying applications, not from CipherComply
itself. [PRIVACY-BOUNDARY.md](PRIVACY-BOUNDARY.md) has the full boundary.

## What is built

| Part | Where | Notes |
|---|---|---|
| Contract | `contracts/ciphercomply.schnorr.compact` | Three circuits: verify and register, rotate oracle key, revoke subject. Schnorr signature verification is composed in-circuit, because Compact 0.31.1 has no built-in for it. Block-time expiry, nullifiers, revocation epochs. |
| Oracle signer | `lib/oracle-signer.ts` | Jubjub Schnorr, with golden vectors. No HTTP surface. |
| Policy engine | `lib/policy-engine.ts` | Deterministic rules: document type, issuer, name, date, amount, cross-check between two independent readings. |
| Gateway | `lib/gateway.ts`, `lib/http.ts` | Subject-ownership proof, idempotency, rate limits, one-use document registry. |
| Web app | `frontend/` | Next.js. Lace wallet flow, verification history, privacy disclosure. |
| Example relying app | `frontend/src/app/example` | Unlocks only for the holder of a verified subject. |
| Evidence | `scripts/verify-onchain.ts`, `evidence/` | Re-checks recorded transactions and ledger state. |

## Run it locally

Requirements: Node 25 (the version tested and used in CI), the Compact compiler 0.31.1, a Midnight proof
server 8.1.0, and a Gemini API key. Network endpoints and secrets come from
`.env`; `.env.example` lists every variable.

```
npm ci
npm run dev:setup        # generates development keys and tokens into .env
npm run compile          # optional: the compiled contract is committed
npm test
cd frontend && npm install && npm run dev
```

`npm run samples` writes invented sample documents to `samples/`, one that
passes and several that are refused for different reasons.

## Known limits

- **Sign-in is a development token** and the oracle key is held in process
  memory. Production authentication and key custody are not built. The hosted
  demo runs in an explicit demo mode that is refused on any network but Preview.
- **A document's text is trusted once read.** The service does not yet verify
  who issued a document, so an edited payslip could pass. Verifying issuer
  signatures is the next piece of work.
- **One policy.** Income of at least USD 85,000, from an allow-listed issuer.
- **The verification key lives in the browser.** Clearing browser data loses
  the ability to act as that subject.
- **A proof server is required** by the user's wallet to submit on-chain.
- **The hosted registry is not durable.** It resets when the host restarts; the
  on-chain nullifier still prevents double registration.
- **Not audited,** and key rotation has not been exercised on-chain.

Every deviation from the specification is listed in
[SPIKE-REPORT.md](SPIKE-REPORT.md). Threats and open gaps are in
[THREAT-MODEL.md](THREAT-MODEL.md) and [SECURITY.md](SECURITY.md). The original
specification is in `docs/spec/`.
