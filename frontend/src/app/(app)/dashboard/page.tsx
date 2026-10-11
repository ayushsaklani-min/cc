"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SessionSummary } from "@/components/app-shell";
import { useService } from "@/components/service";
import { Card, Eyebrow, LinkButton, Row } from "@/components/ui";
import { AssuranceRows, OutcomeBadge, useChainConfirmation } from "@/components/verification";
import { useWallet, WalletButton, walletStatusText } from "@/components/wallet";
import { formatBytes, formatDateTime, policyRequirement, MIME_LABEL, PHASE_LABEL } from "@/lib/copy";
import { useVerifications } from "@/lib/store";

export default function Dashboard() {
  const { service } = useService();
  const records = useVerifications();
  const wallet = useWallet();
  const latest = records?.[0];
  // Keeps the latest record honest: it becomes "confirmed" only when the ledger says so.
  useChainConfirmation(latest);
  if (service.kind !== "ready") return null;
  const { config } = service;
  const { policy } = config;

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <Eyebrow>Your verification workspace</Eyebrow>
        <h1 className="mt-3 font-display text-5xl font-medium leading-[0.98] tracking-[-0.04em] sm:text-6xl">
          Verify <em className="font-normal">privately.</em>
        </h1>
        <p className="mt-3 text-lg text-muted">Prove only what matters.</p>
        <p className="mt-4 text-[15px] text-ink/80">
          {latest === undefined
            ? "Start by uploading the document your policy asks for. You will see how it is processed before anything is sent."
            : latest.phase === "confirmed"
              ? "Your latest verification is confirmed on the network."
              : latest.phase === "attested"
                ? "Your latest document passed the policy check. It is not confirmed on-chain yet."
                : "You can start a new verification at any time."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card aria-labelledby="start-heading">
          <h2 id="start-heading" className="font-display text-2xl font-medium tracking-[-0.02em]">
            Start a verification
          </h2>
          <p className="mt-2 text-[15px] text-muted">Upload the document required by your selected policy.</p>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            <Row label="Policy">{policyRequirement(policy)}</Row>
            <Row label="Accepted files">
              {config.upload.mimeTypes.map((m) => MIME_LABEL[m] ?? m).join(", ")} · up to {formatBytes(config.upload.maxBytes)}
            </Row>
            <Row label="Signed in with">
              <SessionSummary />
            </Row>
          </dl>
          <LinkButton href="/verify" className="mt-6 w-full sm:w-auto">
            Choose document
            <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </Card>

        <div className="space-y-6">
          <Card aria-labelledby="status-heading">
            <h2 id="status-heading" className="font-display text-lg font-medium tracking-[-0.015em]">
              Verification status
            </h2>
            <div className="mt-4">
              {records === null ? (
                <p className="text-[15px] text-muted">Loading…</p>
              ) : latest ? (
                <OutcomeBadge record={latest} />
              ) : (
                <p className="text-[15px] text-muted">Not started</p>
              )}
            </div>
            {latest && (
              <dl className="mt-4 divide-y divide-line border-t border-line">
                <AssuranceRows record={latest} />
                {latest.chainValidUntil !== undefined && (
                  <Row label="Valid until (on-chain)">{formatDateTime(latest.chainValidUntil * 1000)}</Row>
                )}
              </dl>
            )}
            {latest && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {latest.phase === "attested" && (
                  <LinkButton href={`/verifications/${latest.id}`} className="min-h-10 px-5">
                    Submit on-chain
                  </LinkButton>
                )}
                <Link href={`/verifications/${latest.id}`} className="text-[15px] font-medium underline underline-offset-4">
                  View details
                </Link>
              </div>
            )}
          </Card>

          <Card aria-labelledby="network-heading">
            <h2 id="network-heading" className="font-display text-lg font-medium tracking-[-0.015em]">
              Network
            </h2>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Environment">
                <span className="capitalize">Midnight {config.network}</span>
              </Row>
              <Row label="Service">Reachable</Row>
              <Row label="Wallet">{walletStatusText(wallet.state)}</Row>
            </dl>
            <div className="mt-4">
              <WalletButton />
            </div>
            <p className="mt-3 text-[14px] text-muted">
              A wallet is only needed for the last step: confirming an issued attestation on-chain. It pays the network fee.
            </p>
          </Card>
        </div>
      </div>

      <Card aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="font-display text-lg font-medium tracking-[-0.015em]">
          Recent activity
        </h2>
        <p className="mt-1 text-[14px] text-muted">Stored in this browser only. No document content is kept here.</p>
        {records === null ? (
          <p className="mt-6 text-[15px] text-muted">Loading…</p>
        ) : records.length === 0 ? (
          <p className="mt-6 text-[15px] text-muted">Nothing yet. Your verifications will appear here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {records.slice(0, 8).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/verifications/${r.id}`}
                  className="flex flex-col gap-1 rounded-xl py-4 hover:bg-neutral-soft sm:flex-row sm:items-center sm:justify-between sm:px-3"
                >
                  <span className="text-[15px] font-medium">{PHASE_LABEL[r.phase]}</span>
                  <span className="text-[14px] text-muted">
                    {formatDateTime(r.createdAt)} · <span className="font-mono">{r.id.slice(0, 8)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
