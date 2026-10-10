// The data-processing disclosure. Every sentence is derived from the server's
// reported configuration; if the mode or provider changes, so does this text
// and the acknowledgement is asked for again.
"use client";

import type { PublicConfig } from "@/lib/api";
import { formatDuration } from "@/lib/copy";

export const disclosureVersion = (c: PublicConfig) =>
  ["v1", c.processing.mode, c.processing.extractionProvider, c.processing.extractionModel, c.processing.crossCheckModel ?? "-", c.network].join("|");

export function PrivacyDisclosure({ config }: { config: PublicConfig }) {
  const { processing } = config;
  return (
    <div className="space-y-5 text-[15px] leading-relaxed">
      <Item title="Where your document goes">
        Your document is uploaded to this application&apos;s server and sent to {processing.extractionProvider} (model{" "}
        <code className="font-mono text-[13px]">{processing.extractionModel}</code>
        {processing.crossCheckModel ? (
          <>
            , and again to <code className="font-mono text-[13px]">{processing.crossCheckModel}</code> for an independent second
            reading
          </>
        ) : null}
        ) to read the figures from it. Both the server and the AI provider can see the document in full. This is the only
        processing mode this deployment offers.
      </Item>
      <Item title="What decides the result">
        The AI reads the document; fixed policy rules then decide eligibility. A zero-knowledge proof later checks that a valid
        attestation exists for you. It does not prove the document is genuine or that it was read correctly.
      </Item>
      <Item title="What becomes public">
        Your document, your income and the figures read from it are not written to the public ledger. If you complete on-chain
        confirmation, the Midnight {config.network} ledger will publicly show a pseudonymous identifier for you, how long your
        verification is valid, a one-time marker for the attestation, and roughly when it was issued. Ledger data is permanent,
        and activity under the same identifier can be linked together.
      </Item>
      <Item title="What is kept">
        The server keeps a keyed fingerprint of the document (not the document&apos;s plain hash) and the signed attestation, so
        the same document cannot be used twice. A retention period and deletion process have not been defined for this
        deployment yet. The attestation itself is valid for {formatDuration(config.attestationTtlSeconds)} after it is issued.
      </Item>
      <Item title="What stays in this browser">
        The secret key behind your pseudonymous identifier is generated in this browser and never sent to the server. Clearing
        this browser&apos;s data deletes it, and with it your ability to act as that identifier.
      </Item>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="mt-1 text-ink/80">{children}</p>
    </div>
  );
}
