# CipherComply — Wave 1 submission

**Prove you qualify. Reveal nothing else.**

## Links

- Live app: https://ciphercomply.vercel.app
- Try to break the contract, no wallet needed: https://ciphercomply.vercel.app/sandbox
- An app that uses a verification: https://ciphercomply.vercel.app/example
- Source (Apache-2.0): https://github.com/ayushsaklani-min/cc
- On-chain evidence, re-checkable by anyone: [proof.md](proof.md)
- Video (3 min, product film and a real run): https://youtu.be/QPNuGXtu6nM

## What it is

Apps on Midnight increasingly need to know one thing about a user: are they
eligible? Earning above a threshold, over 18, an accredited investor. Today the
only way to prove that is to hand over the whole document, and every app that
asks ends up holding sensitive files it never needed.

CipherComply turns a document into a single private fact on Midnight. The user
proves "I meet this policy". The chain records a pseudonymous identifier and a
validity date. An app asks one question, *is this identifier verified?*, and
never sees the document, the income, the date of birth, the name or the wallet
address.

## The trust model, in one line

**One checker sees your document, once. Apps and the chain never do.**

Zero-knowledge proofs cannot read a PDF, so something must check the document
before anything can be proven. In CipherComply that checker is the service,
once. Without it, proving one fact to five apps means five copies of your
document in five databases. With it, each app gets a yes or no for an
identifier that is not your name or your wallet, and you reuse that result
without uploading again. It is not zero trust, and we say so: the user trusts
the checker. The roadmap below is about shrinking that trust.

## How privacy shapes the design

- **Nothing personal reaches the ledger.** Only a contract-scoped pseudonymous
  subject, a validity date and a single-use nullifier.
- **The oracle signs only for a subject the user proves they control,** with a
  Schnorr signature over a server challenge. The secret never leaves the
  browser.
- **The contract checks the oracle's signature inside the circuit** (composed
  from Compact 0.31.1 primitives, because there is no built-in), along with
  policy, expiry, replay and revocation.
- **Relying apps learn a yes or no,** and can require the visitor to prove
  control of the subject first, as the example app does.
- **The privacy boundary is stated honestly:** the service reads the document
  to check it. It is private from the chain and from relying apps, not from
  CipherComply itself. See `privacy-boundary.md`.

## Two policies, two kinds of evidence

| Policy | Evidence | How it is checked | Who sees the document |
|---|---|---|---|
| **Aged 18 or over** | DigiLocker's PAN Verification Record | Issuer's digital signature verified against a pinned certificate, then read by rule. No AI. | The CipherComply server only |
| Annual income of at least USD 85,000 | Payslip, tax return or employer letter | Read by a model, cross-checked by a second model, decided by fixed rules | The server and Google's Gemini API |

The over-18 policy is the design we are moving towards: a document whose
signature does not verify is refused, so an edited PDF cannot pass, no AI
provider sees it, and one person's record can verify only one identity. The
income policy keeps the original design. The hosted demo uses Gemini's free
tier, under which Google may use submitted content to improve its products and
human reviewers may read it; the disclosure says so before upload, and the
demo asks for sample documents only.

## Current state, with evidence

- **Two contracts on Midnight Preview**, one per policy, and five settled
  transactions: two deployments, three attestations (one through the Lace
  browser wallet) and a revocation.
- **55 on-chain checks** re-verify all of it against the public indexer:
  `npm run verify:onchain`.
- **200 offline tests**, including every contract refusal and every way a
  signed document can be tampered with.
- **CI on every push:** clean install, dependency audit, secret scan, compile
  with the pinned compiler, typecheck, tests, on-chain evidence.
- **A sandbox** that runs the compiled contract in the browser: three
  legitimate actions and eleven attacks, each answered by the contract itself.

## What the contract refuses

Someone else redeeming your attestation; an amount or validity edited after
signing; a fake oracle; a signed "not eligible"; assurance below the policy
minimum; an expired attestation; a replay; a shortened status; a revocation by a
non-admin; an attestation issued before a revocation. Each is a test, and each
can be tried in the sandbox.

## Known limits

Development sign-in and an oracle key held in memory; a signed record proves the
document, not that the uploader is the person in it; issuer trust is a pinned
certificate; a local proof server is needed to submit from the browser; no
independent audit; no users or partners yet. All of these are written down in
`../README.md`, `threat-model.md` and `spike-report.md`.

## What changed in this wave

See [waves.md](waves.md).

## Next

Shrinking what the checker must be trusted with:
1. **Signed sources instead of AI** for income, as the over-18 policy already
   does for age. In India, consent-based financial data from banks is one
   candidate we have not yet evaluated.
2. **A sealed checker:** run the verification in a confidential-computing
   enclave, so that even the operator cannot see the document and anyone can
   check which code ran.

And for the next wave: a written self-audit, oracle key rotation exercised
on-chain, a way for a reviewer to complete a real verification without running
a proof server, and a first integration partner.
