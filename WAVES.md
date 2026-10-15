# Progress by wave

What changed in each submission, so a judge can see the iteration without
reading the commit history. Every claim links to evidence in this repository or
on the public Midnight Preview network.

## Wave 1

### Starting point

A frozen specification for private eligibility attestations on Midnight
(`docs/spec/`), and no code.

### What was built

**Contract and cryptography**
- Compact contract (`contracts/ciphercomply.schnorr.compact`, compiler 0.31.1)
  with three circuits: verify and register, rotate the oracle key, revoke a
  subject. Schnorr signature verification is composed in-circuit, because the
  pinned compiler has no built-in for it (deviation D-1 in `SPIKE-REPORT.md`).
- Block-time expiry, single-use nullifiers, revocation epochs that only move
  forward, and statuses that can be extended but never shortened.
- An oracle signer with golden test vectors, and a subject-ownership proof so the
  oracle signs only for an identifier the requester controls.

**Two policies, two kinds of evidence**
- *Annual income of at least USD 85,000*: a document is read by a model,
  cross-checked by a second model, and decided by fixed rules.
- *Aged 18 or over*: DigiLocker's PAN Verification Record. The issuer's digital
  signature is verified against a pinned certificate before anything in the
  file is believed, and the record is read by rule. No model is involved, an
  edited or home-made PDF is refused, and one person can verify only one
  identifier.

**Product**
- Gateway API with idempotency, rate limits and a one-use document registry.
- Web app with a Lace wallet flow, a data-processing disclosure written from the
  server's real configuration, verification history and block-explorer links.
- An example relying application that unlocks only for the holder of a verified
  identifier, without seeing a document, a name or a wallet address.
- A sandbox that runs the compiled contract in the browser, with no wallet, and
  lets anyone try eleven attacks against it.

**On-chain, on Midnight Preview**
- Two contract deployments, one per policy.
- Five settled transactions: two deployments, three attestations (including one
  through the Lace browser wallet), and one revocation. See `PROOF.md`.

**Quality**
- 200 offline tests, 55 on-chain evidence checks (`npm run verify:onchain`).
- CI on every push: clean install, dependency audit, secret scan, compile with
  the pinned compiler, typecheck, tests, and the on-chain evidence check.
- Threat model, privacy boundary, and a list of every deviation from the
  specification with its reason.

### What changed within the wave

The first version trusted a document's text once a model had read it, so an
edited payslip could pass. The over-18 policy was added to remove that
weakness: its evidence is checked by issuer signature, not read by a model.
The income policy keeps the original design and says so in its disclosure.

### Known limits at the end of Wave 1

See the "Known limits" section of `README.md`. The main ones: development
sign-in and an oracle key held in memory; a signed record proves the document,
not that the uploader is the person in it; a local proof server is needed to
submit from the browser; no independent audit; no users or partners yet.

### Planned for Wave 2

- A written self-audit with findings and fixes.
- Oracle key rotation exercised on-chain.
- A way for a reviewer to complete a real verification without running a
  proof server.
- A first integration partner.
