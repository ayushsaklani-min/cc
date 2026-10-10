"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PrivacyDisclosure, disclosureVersion } from "@/components/privacy-disclosure";
import { useService } from "@/components/service";
import { Button, Card, Eyebrow, LinkButton, Notice, Row } from "@/components/ui";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ResultPanel, TechnicalDetails, useChainConfirmation, useOnChainSubmit, VerificationStepper } from "@/components/verification";
import { DOCUMENT_TYPE_LABEL, formatMoney, reasonText } from "@/lib/copy";
import { saveVerification, setConsent, useConsent, useVerifications, type VerificationRecord } from "@/lib/store";
import { currentSubject, newRecord, runVerification, validateFile } from "@/lib/verify-flow";

const BUSY = ["uploading", "analyzing", "proving", "submitting"];

export default function VerifyPage() {
  const { service, session } = useService();
  const consent = useConsent();
  const records = useVerifications();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploadFraction, setUploadFraction] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const record = records?.find((r) => r.id === activeId);
  const { status: chain, check } = useChainConfirmation(record);
  const onChain = useOnChainSubmit(record, service.kind === "ready" ? service.config : null, check);

  // Move focus to the result when a run reaches an outcome, so it is announced.
  const phase = record?.phase;
  useEffect(() => {
    if (phase && !BUSY.includes(phase) && phase !== "idle") statusRef.current?.focus();
  }, [phase]);

  if (service.kind !== "ready" || session.kind !== "signed_in") return null;
  const { config } = service;
  const { policy } = config;
  const version = disclosureVersion(config);
  const acknowledged = consent === version;
  const busy = starting || (record !== undefined && BUSY.includes(record.phase));

  const select = async (next: File | null) => {
    setFile(next);
    setFileError(null);
    if (next) {
      const problem = await validateFile(next, config);
      if (problem) setFileError(reasonText(problem) === "The verification could not be completed." ? problem : reasonText(problem));
    }
  };

  const start = async (retry?: VerificationRecord) => {
    if (!file || fileError) return;
    setStarting(true);
    setUploadFraction(null);
    try {
      const base = retry ?? newRecord(config, await currentSubject(config), file);
      setActiveId(base.id);
      saveVerification(base);
      await runVerification(config, session.token, file, base, { onRecord: saveVerification, onUploadProgress: setUploadFraction });
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setActiveId(null);
    setFile(null);
    setFileError(null);
    setUploadFraction(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Eyebrow>Verification</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Verify your eligibility</h1>
      </div>

      <Card aria-labelledby="policy-heading">
        <h2 id="policy-heading" className="text-xl font-semibold">
          1. Policy
        </h2>
        <p className="mt-2 text-[15px] text-muted">This deployment enforces one policy.</p>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          <Row label="Requirement">Annual income of at least {formatMoney(policy.thresholdMinorUnits, policy.currency)}</Row>
          <Row label="Accepted documents">{policy.allowedDocumentTypes.map((t) => DOCUMENT_TYPE_LABEL[t] ?? t).join(", ")}</Row>
          <Row label="Document age">No older than {policy.freshnessDays} days</Row>
          <Row label="Policy version">
            <span className="font-mono text-[13px]">{policy.id}</span>
          </Row>
        </dl>
      </Card>

      <Card aria-labelledby="disclosure-heading">
        <h2 id="disclosure-heading" className="text-xl font-semibold">
          2. How your document is processed
        </h2>
        <div className="mt-5">
          <PrivacyDisclosure config={config} />
        </div>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-[var(--ink)]"
            checked={acknowledged}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked ? version : null)}
          />
          <span className="text-[15px]">
            I understand that my document will be sent to this server and to {config.processing.extractionProvider}, and what
            becomes public if I confirm on-chain.
          </span>
        </label>
      </Card>

      <Card aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-xl font-semibold">
          3. Document
        </h2>
        {!acknowledged && <p className="mt-2 text-[15px] text-muted">Acknowledge the disclosure above to choose a document.</p>}
        <div className="mt-5">
          <UploadDropzone
            config={config}
            file={file}
            error={fileError}
            disabled={!acknowledged || busy || record !== undefined}
            onSelect={(f) => void select(f)}
          />
        </div>
        {record === undefined && (
          <Button className="mt-6 w-full sm:w-auto" disabled={!acknowledged || !file || fileError !== null} loading={starting} onClick={() => void start()}>
            Upload and verify
          </Button>
        )}
      </Card>

      {record && (
        <Card aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="text-xl font-semibold">
            4. Progress
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <VerificationStepper record={record} uploadFraction={uploadFraction} />
            <div ref={statusRef} tabIndex={-1} aria-live="polite" className="space-y-4 outline-none">
              <ResultPanel
                record={record}
                config={config}
                chain={chain}
                onCheckChain={() => void check()}
                onRetry={record.retryable && file ? () => void start(record) : undefined}
                onSubmitOnChain={() => void onChain.submit()}
                submitStarting={onChain.starting}
              />
              {record.phase === "error" && record.retryable && !file && (
                <Notice tone="neutral" title="Choose the same document again to retry" />
              )}
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <TechnicalDetails record={record} config={config} />
            {!busy && (
              <div className="flex flex-wrap gap-3">
                <LinkButton href={`/verifications/${record.id}`} variant="secondary">
                  View details
                </LinkButton>
                <Button variant="quiet" onClick={reset}>
                  Start another verification
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <p className="text-[14px] text-muted">
        Questions about what is stored? See{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy &amp; settings
        </Link>
        .
      </p>
    </div>
  );
}
