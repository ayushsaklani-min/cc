// Proves and submits an issued attestation through the user's wallet. The
// "proving" and "submitting" phases are entered only from the wallet flow's own
// callbacks, and "confirmed" is never set here: that comes from indexed chain
// state alone (see useChainConfirmation).
"use client";

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { PublicConfig } from "./api";
import { getUserSecretHex, type VerificationRecord } from "./store";

const loadSubmit = () => import("../../../lib/browser-submit");

/** The contract's assertion messages, mapped to the reason codes the UI already explains. */
const CONTRACT_REJECTIONS: [string, string][] = [
  ["Attestation expired", "attestation_expired_unsubmitted"],
  ["Attestation already used", "attestation_already_used"],
  ["Issued before revocation", "subject_revoked"],
  ["Subject mismatch", "wallet_identity_mismatch"],
  ["Invalid oracle signature", "attestation_no_longer_valid"],
  ["Status would move backward", "status_would_move_backward"],
];

export async function submitOnChain(
  config: PublicConfig,
  record: VerificationRecord,
  onRecord: (record: VerificationRecord) => void,
  connect: () => Promise<ConnectedAPI>,
): Promise<void> {
  let current = record;
  const update = (patch: Partial<VerificationRecord>) => {
    current = { ...current, ...patch };
    onRecord(current);
  };
  // A failed attempt returns to "attested": the attestation is still held and may be retried until it expires.
  const backToAttested = (submitError: string, submitDetail?: string) =>
    update({ phase: "attested", submitError, submitDetail });

  const secretHex = getUserSecretHex();
  if (!record.attestation || secretHex === null) return backToAttested("identity_key_missing");

  let submit: Awaited<ReturnType<typeof loadSubmit>>;
  try {
    submit = await loadSubmit();
  } catch {
    return backToAttested("wallet_error");
  }

  try {
    update({ submitError: undefined, submitDetail: undefined });
    submit.takeLastWalletError();
    const api = await connect();
    const { unhex } = await import("../../../lib/client-ownership");
    const result = await submit.submitAttestation(
      api,
      {
        network: config.network,
        contractAddress: config.contractAddress,
        zkArtifactsUrl: `${window.location.origin}/api/zk`,
        userSecret: unhex(secretHex),
        issued: record.attestation,
      },
      {
        onProving: () => update({ phase: "proving" }),
        onSubmitting: () => update({ phase: "submitting" }),
      },
    );
    // Finalized according to Midnight.js. The page still waits for the indexed status before saying "Verified".
    update({ phase: "submitting", txId: result.txId, blockHeight: result.blockHeight });
  } catch (e) {
    // A wallet failure inside a Midnight.js provider arrives wrapped; recover the original.
    const walletError = e instanceof submit.WalletError ? e : submit.takeLastWalletError();
    if (walletError) {
      const where = { connect: "connecting", balance: "balancing and signing", submit: "submitting" }[walletError.stage ?? ""];
      const detail = [where ? `While ${where}` : undefined, walletError.detail].filter(Boolean).join(" — ") || undefined;
      if (process.env.NODE_ENV !== "production") console.error("[submit] wallet", walletError.code, detail);
      return backToAttested(walletError.code, detail);
    }
    const message = e instanceof Error ? e.message : "";
    // Development aid: the error class and first line only. Midnight.js errors here do not carry witness values.
    if (process.env.NODE_ENV !== "production") {
      console.error("[submit]", e instanceof Error ? e.name : typeof e, message.split(/\r?\n/)[0]);
    }
    const rejection = CONTRACT_REJECTIONS.find(([text]) => message.includes(text));
    if (rejection) return update({ phase: "error", reason: rejection[1], retryable: false });
    backToAttested("submit_failed");
  }
}
