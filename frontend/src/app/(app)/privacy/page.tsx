"use client";

import { useState } from "react";
import { SessionSummary } from "@/components/app-shell";
import { PrivacyDisclosure } from "@/components/privacy-disclosure";
import { useService } from "@/components/service";
import { Button, Card, Eyebrow, Notice, Row } from "@/components/ui";
import { formatDuration } from "@/lib/copy";
import { clearVerifications, setConsent, setSessionToken, setUserSecretHex, useHasUserSecret, useVerifications } from "@/lib/store";

export default function PrivacySettings() {
  const { service } = useService();
  const records = useVerifications();
  const hasSecret = useHasUserSecret();
  const [confirmingKey, setConfirmingKey] = useState(false);
  if (service.kind !== "ready") return null;
  const { config } = service;
  const { processing } = config;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Eyebrow>Privacy &amp; settings</Eyebrow>
        <h1 className="mt-3 font-display text-4xl font-medium leading-[1] tracking-[-0.035em] sm:text-5xl">What happens to your data</h1>
      </div>

      <Card aria-labelledby="mode-heading">
        <h2 id="mode-heading" className="font-display text-xl font-medium tracking-[-0.02em]">
          Processing
        </h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          <Row label="Mode">Server-mediated</Row>
          <Row label="Document reader">{processing.extractionProvider ?? "No AI model: issuer signature and fixed rules"}</Row>
          <Row label="Model">
            {processing.extractionModel ? <span className="font-mono text-[13px]">{processing.extractionModel}</span> : "Not used"}
          </Row>
          <Row label="Independent second reading">
            {processing.crossCheckModel ? <span className="font-mono text-[13px]">{processing.crossCheckModel}</span> : "Not used"}
          </Row>
          <Row label="Attestation lifetime">{formatDuration(config.attestationTtlSeconds)}</Row>
          <Row label="Verification validity once confirmed">{formatDuration(config.statusTtlSeconds)}</Row>
          <Row label="Retention period">Not defined yet</Row>
        </dl>
        <p className="mt-3 text-[14px] text-muted">
          Server-mediated is the only mode this deployment offers. Modes that keep the document away from the server or the AI
          provider are not built.
        </p>
      </Card>

      <Card aria-labelledby="disclosure-heading">
        <h2 id="disclosure-heading" className="font-display text-xl font-medium tracking-[-0.02em]">
          Full disclosure
        </h2>
        <div className="mt-5">
          <PrivacyDisclosure config={config} />
        </div>
      </Card>

      <Card aria-labelledby="controls-heading">
        <h2 id="controls-heading" className="font-display text-xl font-medium tracking-[-0.02em]">
          This browser
        </h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          <Row label="Signed in with">
            <SessionSummary />
          </Row>
          <Row label="Identity key">{hasSecret ? "Stored in this browser" : "None yet (created on first verification)"}</Row>
          <Row label="Verification history">{records === null ? "…" : `${records.length} stored in this browser`}</Row>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setSessionToken(null)}>
            Sign out
          </Button>
          <Button variant="secondary" disabled={!records?.length} onClick={clearVerifications}>
            Clear verification history
          </Button>
          <Button variant="secondary" onClick={() => setConsent(null)}>
            Withdraw disclosure acknowledgement
          </Button>
          <Button variant="secondary" disabled={!hasSecret} onClick={() => setConfirmingKey(true)}>
            Delete identity key
          </Button>
        </div>

        {confirmingKey && (
          <div className="mt-6 space-y-4">
            <Notice tone="warning" title="Delete the identity key from this browser?">
              You will get a new pseudonymous identifier next time. Any attestation already issued to the current one can no
              longer be submitted, and documents already used cannot be used again under a new identifier. This does not remove
              anything from the server or the public ledger, and it cannot be undone.
            </Notice>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setUserSecretHex(null);
                  setConfirmingKey(false);
                }}
              >
                Delete key
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingKey(false)}>
                Keep key
              </Button>
            </div>
          </div>
        )}
        <p className="mt-4 text-[14px] text-muted">
          These controls affect this browser only. There is no way yet to request deletion of what the server holds.
        </p>
      </Card>
    </div>
  );
}
