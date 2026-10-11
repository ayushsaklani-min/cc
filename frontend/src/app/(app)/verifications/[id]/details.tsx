"use client";

import { useEffect } from "react";
import { useService } from "@/components/service";
import { Card, Details, Eyebrow, LinkButton, Notice, Row } from "@/components/ui";
import {
  AssuranceRows,
  OutcomeBadge,
  ResultPanel,
  TechnicalDetails,
  useChainConfirmation,
  useOnChainSubmit,
  VerificationStepper,
} from "@/components/verification";
import { formatBytes, formatDateTime, policyRequirement } from "@/lib/copy";
import { setSelectedPolicy, useVerifications } from "@/lib/store";

export function VerificationDetails({ id }: { id: string }) {
  const { service } = useService();
  const records = useVerifications();
  const record = records?.find((r) => r.id === id);
  const { status: chain, check } = useChainConfirmation(record);
  const walletSubmit = useOnChainSubmit(record, service.kind === "ready" ? service.config : null, check);

  // A record belongs to one policy and one contract: show it against that one.
  const servedPolicy = service.kind === "ready" ? service.config.policy.id : undefined;
  useEffect(() => {
    if (record && servedPolicy && record.policyId !== servedPolicy) setSelectedPolicy(record.policyId);
  }, [record, servedPolicy]);

  if (service.kind !== "ready") return null;
  const { config } = service;
  if (record && record.policyId !== config.policy.id) return null;

  if (records === null) {
    return (
      <p role="status" className="text-muted">
        Loading…
      </p>
    );
  }
  if (!record) {
    return (
      <div className="max-w-xl space-y-4">
        <Notice tone="neutral" title="This verification is not in this browser.">
          Verification history is stored only in the browser that created it.
        </Notice>
        <LinkButton href="/dashboard" variant="secondary">
          Back to overview
        </LinkButton>
      </div>
    );
  }

  const eligibility =
    record.attestation !== undefined
      ? "Eligible under the policy"
      : record.phase === "rejected"
        ? "Not eligible"
        : record.phase === "review"
          ? "Undecided — needs review"
          : "No decision";
  const onChain =
    record.phase === "confirmed" ? "Confirmed" : record.attestation !== undefined ? "Not confirmed" : "Not applicable";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Eyebrow>Verification details</Eyebrow>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-4xl font-medium leading-[1] tracking-[-0.035em]">{formatDateTime(record.createdAt)}</h1>
          <OutcomeBadge record={record} />
        </div>
      </div>

      <Card aria-labelledby="outcome-heading">
        <h2 id="outcome-heading" className="font-display text-xl font-medium tracking-[-0.02em]">
          Outcome
        </h2>
        <div className="mt-5" aria-live="polite">
          <ResultPanel
            record={record}
            config={config}
            chain={chain}
            onCheckChain={() => void check()}
            onSubmitOnChain={() => void walletSubmit.submit()}
            submitStarting={walletSubmit.starting}
          />
        </div>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          <Row label="Eligibility decision">{eligibility}</Row>
          <Row label="On-chain confirmation">{onChain}</Row>
          <AssuranceRows record={record} />
          <Row label="Policy">{policyRequirement(config.policy)}</Row>
          <Row label="Valid until">
            {record.chainValidUntil !== undefined ? formatDateTime(record.chainValidUntil * 1000) : "Not known until confirmed on-chain"}
          </Row>
          <Row label="Network">
            <span className="capitalize">Midnight {record.network}</span>
          </Row>
        </dl>
      </Card>

      <Card aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="font-display text-xl font-medium tracking-[-0.02em]">
          Progress
        </h2>
        <div className="mt-6">
          <VerificationStepper record={record} />
        </div>
      </Card>

      <div className="space-y-3">
        <TechnicalDetails record={record} config={config} />
        <Details title="Privacy details">
          <dl className="divide-y divide-line">
            <Row label="Document">
              {record.fileName} · {formatBytes(record.fileSize)}
            </Row>
            <Row label="Where this record is stored">This browser only</Row>
          </dl>
          <p className="mt-3 text-[14px] text-muted">
            Only the file name and size are kept here. The figures read from your document are not shown and are not written to
            the public ledger. If an attestation was issued, a copy is held in this browser so it can be submitted on-chain.
          </p>
        </Details>
      </div>

      <LinkButton href="/dashboard" variant="secondary">
        Back to overview
      </LinkButton>
    </div>
  );
}
