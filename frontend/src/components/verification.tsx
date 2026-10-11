// VerificationStepper, ResultPanel and TechnicalDetails, plus the hook that
// promotes a record to "confirmed" — only from finalized, indexed chain state.
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle, CircleAlert, CircleX, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchChainStatus, type ChainStatus, type PublicConfig } from "@/lib/api";
import { ASSURANCE_LABEL, formatDateTime, METHOD_LABEL, PHASE_LABEL, PHASE_TONE, reasonText } from "@/lib/copy";
import { saveVerification, type Phase, type VerificationRecord } from "@/lib/store";
import { submitOnChain } from "@/lib/wallet-flow";
import { useWallet } from "./wallet";
import { Button, Details, Identifier, Notice, Row, StatusBadge } from "./ui";

const STEPS = [
  "Upload document",
  "Read document and evaluate policy",
  "Attestation issued",
  "Generate proof",
  "Submit to Midnight",
  "Confirmed on-chain",
] as const;

type StepState = "complete" | "current" | "waiting" | "upcoming" | "stopped-error" | "stopped-review";

function stepStates(record: VerificationRecord): StepState[] {
  const at = (current: number, state: StepState): StepState[] =>
    STEPS.map((_, i) => (i < current ? "complete" : i === current ? state : "upcoming"));
  const byPhase: Record<Phase, () => StepState[]> = {
    idle: () => STEPS.map(() => "upcoming"),
    uploading: () => at(0, "current"),
    analyzing: () => at(1, "current"),
    rejected: () => at(1, "stopped-error"),
    review: () => at(1, "stopped-review"),
    // The attestation exists; the next step has not been started by any real event.
    attested: () => at(3, "waiting"),
    proving: () => at(3, "current"),
    submitting: () => at(4, "current"),
    confirmed: () => STEPS.map(() => "complete"),
    error: () => at(record.attestation ? 3 : record.httpStatus === undefined ? 0 : 1, "stopped-error"),
  };
  return byPhase[record.phase]();
}

const STEP_TEXT: Record<StepState, string> = {
  complete: "Complete",
  current: "In progress",
  waiting: "Not started",
  upcoming: "",
  "stopped-error": "Stopped",
  "stopped-review": "Needs review",
};

/** Each step's state comes from the record; nothing here advances on its own. */
export function VerificationStepper({ record, uploadFraction }: { record: VerificationRecord; uploadFraction?: number | null }) {
  const states = stepStates(record);
  return (
    <ol className="space-y-0" aria-label="Verification progress">
      {STEPS.map((label, i) => {
        const state = states[i] ?? "upcoming";
        const last = i === STEPS.length - 1;
        return (
          <li key={label} className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
            {!last && (
              <span className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-line" aria-hidden>
                <span
                  className={`block w-px origin-top bg-success transition-transform duration-700 ease-[var(--ease-out)] ${
                    state === "complete" ? "h-full scale-y-100" : "h-full scale-y-0"
                  }`}
                />
              </span>
            )}
            <StepIcon state={state} />
            <div className="min-w-0 pt-0.5">
              <p className={`text-[15px] ${state === "upcoming" ? "text-muted" : "font-medium text-ink"}`}>{label}</p>
              {STEP_TEXT[state] && (
                <p
                  className={`text-[13px] ${
                    state === "complete"
                      ? "text-success"
                      : state === "stopped-error"
                        ? "text-error"
                        : state === "stopped-review"
                          ? "text-warning"
                          : "text-muted"
                  }`}
                >
                  {STEP_TEXT[state]}
                  {state === "current" && i === 0 && uploadFraction != null ? ` — ${Math.round(uploadFraction * 100)}% sent` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const reduce = useReducedMotion();
  const base = "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-surface";
  if (state === "complete") {
    return (
      <motion.span
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className={`${base} border-success bg-success-soft text-success`}
      >
        <Check className="size-4" aria-hidden />
      </motion.span>
    );
  }
  if (state === "current") {
    return (
      <span className={`${base} border-ink text-ink`}>
        <span className="absolute inset-0 rounded-full border border-ink motion-safe:animate-pulse-ring" aria-hidden />
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      </span>
    );
  }
  if (state === "stopped-error") {
    return (
      <span className={`${base} border-error bg-error-soft text-error`}>
        <CircleX className="size-4" aria-hidden />
      </span>
    );
  }
  if (state === "stopped-review") {
    return (
      <span className={`${base} border-warning bg-warning-soft text-warning`}>
        <CircleAlert className="size-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className={`${base} border-line text-muted`}>
      <Circle className="size-2.5" aria-hidden />
    </span>
  );
}

const POLL_MS = 20_000;

/**
 * Watches the indexed chain status for a record that holds an attestation and
 * promotes it to "confirmed" only when the ledger shows exactly the validity
 * that attestation carries. An older registration for the same subject does
 * not count.
 */
export function useChainConfirmation(record: VerificationRecord | undefined) {
  const [status, setStatus] = useState<ChainStatus | { kind: "idle" } | { kind: "checking" }>({ kind: "idle" });
  const watching = record !== undefined && ["attested", "proving", "submitting"].includes(record.phase);

  const check = useCallback(async () => {
    if (!record) return;
    setStatus((s) => (s.kind === "idle" ? { kind: "checking" } : s));
    const result = await fetchChainStatus(record.subject, record.policyId);
    setStatus(result);
    if (result.kind === "confirmed" && record.attestation && result.validUntil === String(record.attestation.statusValidUntil)) {
      saveVerification({ ...record, phase: "confirmed", chainValidUntil: Number(result.validUntil), confirmedAt: Date.now() });
    }
  }, [record]);

  useEffect(() => {
    if (!watching) return;
    const first = setTimeout(() => void check(), 0);
    const interval = setInterval(() => void check(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [watching, check]);

  return { status, check };
}

/** Starts the wallet flow for a record. Every phase change is written by the real callbacks of that flow. */
export function useOnChainSubmit(record: VerificationRecord | undefined, config: PublicConfig | null, onDone: () => void) {
  const [starting, setStarting] = useState(false);
  const { connect } = useWallet();
  const submit = useCallback(async () => {
    if (!record || !config) return;
    setStarting(true);
    try {
      await submitOnChain(config, record, saveVerification, connect);
    } finally {
      setStarting(false);
      onDone();
    }
  }, [record, config, onDone, connect]);
  return { submit, starting };
}

export function ResultPanel({
  record,
  config,
  chain,
  onCheckChain,
  onRetry,
  onSubmitOnChain,
  submitStarting = false,
}: {
  record: VerificationRecord;
  config: PublicConfig;
  chain: ReturnType<typeof useChainConfirmation>["status"];
  onCheckChain(): void;
  onRetry?: (() => void) | undefined;
  onSubmitOnChain?: (() => void) | undefined;
  submitStarting?: boolean;
}) {
  const reference = record.correlationId ? (
    <p className="mt-2 text-[13px] text-muted">
      Reference: <span className="font-mono">{record.correlationId}</span>
    </p>
  ) : null;

  switch (record.phase) {
    case "uploading":
    case "analyzing":
      return (
        <p role="status" className="text-[15px] text-muted">
          {record.phase === "uploading"
            ? "Sending your document to the server."
            : "The document is being read and checked against the policy. This can take a little while."}
        </p>
      );
    case "rejected":
      return (
        <Notice tone="error" title="Not eligible">
          <p>{reasonText(record.reason)}</p>
          <p className="mt-1">No attestation was issued.</p>
          {reference}
        </Notice>
      );
    case "review":
      return (
        <Notice tone="warning" title="Needs review">
          <p>{reasonText(record.reason)}</p>
          <p className="mt-1">
            No attestation was issued, and this will not be approved automatically. A manual review process is not available in
            this build; you can try again with a clearer document.
          </p>
          {reference}
        </Notice>
      );
    case "proving":
      return (
        <p role="status" className="text-[15px] text-muted">
          Generating the zero-knowledge proof on the proof server your wallet is configured with. This can take a minute.
        </p>
      );
    case "submitting":
      return (
        <div className="space-y-4">
          <p role="status" className="text-[15px] text-muted">
            {record.txId
              ? "The transaction is finalized. Waiting for the indexed state of the network to show your verification."
              : "The proof is ready. Approve the transaction in your wallet; it will then be submitted to the network."}
          </p>
          {record.txId && (
            <Button variant="secondary" onClick={onCheckChain} loading={chain.kind === "checking"}>
              Check on-chain status
            </Button>
          )}
        </div>
      );
    case "attested": {
      return (
        <div className="space-y-4">
          <Notice tone="warning" title="Eligible — awaiting on-chain confirmation">
            <p>
              The policy check passed and a signed attestation was issued to this browser. This is not yet a verification on
              Midnight.
            </p>
            {record.attestationExpiresAt !== undefined && (
              <p className="mt-1">
                The attestation can only be submitted before {formatDateTime(record.attestationExpiresAt * 1000)}.
              </p>
            )}
          </Notice>
          {record.submitError && (
            <Notice tone="error" title="The last submission attempt did not complete">
              <p>{reasonText(record.submitError)}</p>
              {record.submitDetail && (
                <p className="mt-1 break-words text-[14px]">
                  Reported by the wallet: <span className="font-mono text-[13px]">{record.submitDetail}</span>
                </p>
              )}
              <p className="mt-1">Your attestation is still held in this browser and can be submitted until it expires.</p>
            </Notice>
          )}
          {config.onChainSubmission === "browser-wallet" && onSubmitOnChain && (
            <div className="space-y-2">
              <Button onClick={onSubmitOnChain} loading={submitStarting}>
                Connect wallet and submit
              </Button>
              <p className="text-[14px] text-muted">
                Your wallet will ask you to approve the connection and the transaction, and will pay the network fee. Proving
                uses the proof server set in your wallet.
              </p>
            </div>
          )}
          {config.onChainSubmission === "unavailable" && (
            <Notice tone="neutral" title="On-chain submission is not available in this build">
              Proving and submitting from a browser wallet has not been built yet, so this page cannot complete the last three
              steps. If the attestation is submitted another way, this page will show it once the network confirms it.
            </Notice>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={onCheckChain} loading={chain.kind === "checking"}>
              Check on-chain status
            </Button>
            <p role="status" className="text-[14px] text-muted">
              {chain.kind === "not_registered" && "The network has no confirmed verification for you yet."}
              {chain.kind === "confirmed" && "The network shows an earlier verification for you, not this attestation."}
              {chain.kind === "unavailable" && "On-chain status could not be read just now."}
            </p>
          </div>
        </div>
      );
    }
    case "confirmed":
      return (
        <Notice tone="success" title="Verified on Midnight">
          <p>
            The transaction is finalized and the network&apos;s indexed state shows your verification
            {record.chainValidUntil ? `, valid until ${formatDateTime(record.chainValidUntil * 1000)}` : ""}.
          </p>
          <ExplorerLinks record={record} config={config} />
          <p className="mt-3">
            <Link href="/example" className="link-draw text-[15px] font-medium">
              Use it: open the example app that checks this verification →
            </Link>
          </p>
        </Notice>
      );
    case "error":
      return (
        <div className="space-y-4">
          <Notice tone="error" title="The verification could not be completed">
            <p>{reasonText(record.reason)}</p>
            <p className="mt-1">
              {record.retryable
                ? "It is safe to try again: if an attestation was already issued for this request, you will receive that same one rather than a new one."
                : "Trying the same request again will not help."}
            </p>
            {reference}
          </Notice>
          {record.retryable && onRetry && <Button onClick={onRetry}>Try again</Button>}
        </div>
      );
    default:
      return null;
  }
}

/**
 * Links to the configured block explorer: the transaction when its hash is known,
 * otherwise the block it landed in, and always the contract. Renders nothing
 * when the deployment has no explorer.
 */
export function ExplorerLinks({ record, config }: { record: VerificationRecord; config: PublicConfig | null }) {
  const base = config?.explorerUrl?.replace(/\/$/, "");
  if (!base || !config) return null;
  const links: { href: string; label: string }[] = [];
  if (record.txHash) {
    links.push({ href: `${base}/transactions/0x${record.txHash.replace(/^0x/, "")}`, label: "View transaction" });
  } else if (record.blockHeight !== undefined) {
    links.push({ href: `${base}/blocks/${record.blockHeight}`, label: `View block ${record.blockHeight}` });
  }
  links.push({ href: `${base}/contracts/${config.contractAddress}`, label: "View contract" });
  return (
    <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
      {links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="link-draw text-[15px] font-medium">
          {l.label} ↗
        </a>
      ))}
    </p>
  );
}

export function OutcomeBadge({ record }: { record: VerificationRecord }) {
  return <StatusBadge tone={PHASE_TONE[record.phase]}>{PHASE_LABEL[record.phase]}</StatusBadge>;
}

/** Non-sensitive identifiers only. Never the attestation's private fields or the user secret. */
export function TechnicalDetails({ record, config }: { record: VerificationRecord; config: PublicConfig | null }) {
  return (
    <Details title="Technical details">
      <dl className="space-y-4">
        <Identifier label="Pseudonymous subject (public on-chain once confirmed)" value={record.subject} />
        <Identifier label="Request reference (idempotency key)" value={record.id} />
        {record.correlationId && <Identifier label="Server correlation ID" value={record.correlationId} />}
        {config && <Identifier label="Policy ID" value={config.policyId} />}
        {config && <Identifier label="Contract address" value={config.contractAddress} />}
        {record.txId && <Identifier label="Transaction ID" value={record.txId} />}
      </dl>
      <p className="mt-4 text-[14px] text-muted">
        {record.txId
          ? `Included in block ${record.blockHeight ?? "unknown"}.`
          : "No transaction has been submitted for this verification from this browser."}
        {config?.explorerUrl ? "" : " No block explorer is configured for this deployment."}
      </p>
      {record.txId && <ExplorerLinks record={record} config={config} />}
    </Details>
  );
}

export function AssuranceRows({ record }: { record: VerificationRecord }) {
  if (record.assurance === undefined) return null;
  return (
    <>
      <Row label="Assurance tier (signed)">{ASSURANCE_LABEL[record.assurance] ?? record.assurance}</Row>
      {record.method && <Row label="Identity check used">{METHOD_LABEL[record.method] ?? record.method}</Row>}
    </>
  );
}
