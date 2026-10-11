// The sandbox scenarios as plain data, so a page can list them before the contract
// runtime (WebAssembly) has loaded. lib/sandbox.ts holds what each one executes;
// a test keeps the two in step.
export interface ScenarioInfo {
  id: string;
  group: "honest" | "attack" | "admin";
  title: string;
  /** What is being attempted, in one sentence. */
  attempt: string;
  /** "accepted", or the contract's refusal message. */
  expected: string;
}

export const SCENARIO_INFO: ScenarioInfo[] = [
  {id: "verify", group: "honest", title: "An eligible person verifies", attempt: "The oracle signs an attestation for this user, and the user redeems it.", expected: "accepted"},
  {id: "extend", group: "honest", title: "A later attestation extends the status", attempt: "The same user redeems a second attestation with a later validity date.", expected: "accepted"},
  {id: "wrong-owner", group: "attack", title: "Someone else redeems your attestation", attempt: "A stranger takes a validly signed attestation and submits it with their own secret.", expected: "Subject mismatch"},
  {id: "tamper-amount", group: "attack", title: "The amount is changed after signing", attempt: "The user edits the income figure inside an attestation the oracle already signed.", expected: "Invalid oracle signature"},
  {id: "tamper-validity", group: "attack", title: "The validity date is stretched", attempt: "The user gives themselves ten years of validity instead of the signed one day.", expected: "Invalid oracle signature"},
  {id: "rogue-oracle", group: "attack", title: "A fake oracle signs", attempt: "An attacker signs a perfect-looking attestation with a key that is not the registered oracle.", expected: "Invalid oracle signature"},
  {id: "not-eligible", group: "attack", title: "A signed \"not eligible\" result is redeemed", attempt: "The real oracle signs a negative result, and the user tries to register it anyway.", expected: "Not eligible"},
  {id: "low-assurance", group: "attack", title: "The identity check was too weak", attempt: "A validly signed attestation carries assurance level 1; the policy requires 2.", expected: "Assurance below policy minimum"},
  {id: "expired", group: "attack", title: "An attestation is used too late", attempt: "The user waits 16 minutes; an attestation lives for 15.", expected: "Attestation expired"},
  {id: "replay", group: "attack", title: "The same attestation is submitted twice", attempt: "After a successful verification, the identical attestation is replayed.", expected: "Attestation already used"},
  {id: "shorten", group: "attack", title: "A status is shortened", attempt: "A newer attestation with an earlier validity date tries to overwrite a longer one.", expected: "Status would move backward"},
  {id: "non-admin-revoke", group: "admin", title: "A stranger tries to revoke someone", attempt: "A revocation is submitted without the admin secret.", expected: "Not admin"},
  {id: "revoke", group: "admin", title: "The admin revokes a verified person", attempt: "The admin revokes the subject; its status is cleared and the revocation is recorded.", expected: "accepted"},
  {id: "resurrect", group: "admin", title: "An old attestation is used after revocation", attempt: "The user kept an attestation issued before they were revoked, and redeems it afterwards.", expected: "Issued before revocation"},
];
