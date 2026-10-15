"use client";

import { Check, LoaderCircle, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useService } from "@/components/service";
import { Button, Identifier, LinkButton, Notice } from "@/components/ui";
import { proveAccess, type AccessResult, type AccessStep } from "@/lib/access";
import { formatDateTime } from "@/lib/copy";

const STEPS: { id: AccessStep; label: string; detail: string }[] = [
  { id: "key", label: "Find your key", detail: "The verification key stays in this browser. It is not sent anywhere." },
  { id: "sign", label: "Sign this app's challenge", detail: "Proves you control the pseudonymous ID, without a login or a wallet." },
  { id: "status", label: "App reads the on-chain status", detail: "One lookup on Midnight: verified or not, and until when." },
];

const DENIED: Record<Extract<AccessResult, { kind: "denied" }>["reason"], { title: string; text: string }> = {
  not_verified: {
    title: "No verification found for this browser's ID",
    text: "The chain does not show this pseudonymous ID as verified. Finish a verification, wait for it to be confirmed on Midnight, then come back.",
  },
  expired: {
    title: "Your verification has expired",
    text: "The chain shows a verification for this ID, but its validity date has passed. Verify again to renew it.",
  },
  ownership_not_proven: {
    title: "The ownership proof was not accepted",
    text: "The signature did not verify, or the challenge expired. Try again.",
  },
};

/** One line of the gated content: its value sits under a redaction bar until access is granted. */
function GatedRow({ label, value, open, delay }: { label: string; value: string; open: boolean; delay: number }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-5">
      <dt className="annot shrink-0 text-muted">{label}</dt>
      <dd className="relative min-w-0 text-right font-display text-xl tracking-[-0.02em]">
        <span className={open ? "" : "invisible"} aria-hidden={!open}>
          {value || " "}
        </span>
        <span
          aria-hidden
          style={{ transitionDelay: `${delay}ms` }}
          className={`absolute inset-y-0.5 right-0 w-full min-w-44 origin-right bg-ink transition-transform duration-700 ease-[var(--ease-out)] ${open ? "scale-x-0" : "scale-x-100"}`}
        />
        {!open && <span className="sr-only">Hidden until access is granted</span>}
      </dd>
    </div>
  );
}

export default function ExampleRelyingApp() {
  const { service } = useService();
  const [step, setStep] = useState<AccessStep | null>(null);
  const [result, setResult] = useState<AccessResult | null>(null);
  const running = step !== null && result === null;
  const granted = result?.kind === "granted";
  const config = service.kind === "ready" ? service.config : null;

  async function run() {
    if (!config) return;
    setResult(null);
    setStep("key");
    setResult(await proveAccess(config, setStep));
  }

  const stepState = (id: AccessStep): "done" | "active" | "todo" => {
    const at = STEPS.findIndex((s) => s.id === step);
    const i = STEPS.findIndex((s) => s.id === id);
    if (granted || i < at) return "done";
    if (i === at && running) return "active";
    return "todo";
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-ink text-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 lg:px-12">
          <p className="annot">Example relying app · not a real service</p>
          <Link href="/dashboard" className="annot link-draw">
            Back to CipherComply
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14 lg:px-12 lg:py-20">
        <p className="annot text-muted">A separate application, using CipherComply</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[0.98] tracking-[-0.035em] sm:text-6xl">
          Members-only <em className="italic">credit desk</em>
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted">
          This sample app admits only visitors who hold a valid income verification. It asks one question of the chain and gets
          one answer. It never receives a document, an income figure, a name or a wallet address.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <section aria-labelledby="gated-heading" className="border border-ink bg-surface p-6 sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <h2 id="gated-heading" className="font-display text-2xl font-medium tracking-[-0.02em]">
                Member area
              </h2>
              <span className="annot inline-flex items-center gap-2">
                {granted ? <LockOpen className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                {granted ? "Unlocked" : "Locked"}
              </span>
            </div>
            <dl className="mt-6 border-t border-line">
              <GatedRow label="Access" value="Eligible member" open={granted} delay={0} />
              <GatedRow label="Policy met" value={config?.policy.id ?? ""} open={granted} delay={90} />
              <GatedRow
                label="Valid until"
                value={result?.kind === "granted" ? formatDateTime(result.validUntil * 1000) : ""}
                open={granted}
                delay={180}
              />
              <GatedRow label="Checked on" value={config ? `Midnight ${config.network}` : ""} open={granted} delay={270} />
            </dl>
            <p className="mt-5 text-[14px] text-muted">
              {granted
                ? "This is everything the app knows about you. There is no real credit product here: the unlocked area only shows what the check returned."
                : "The lines above stay covered until the chain confirms a valid verification for an ID you control."}
            </p>
          </section>

          <section aria-labelledby="check-heading">
            <h2 id="check-heading" className="font-display text-2xl font-medium tracking-[-0.02em]">
              Access check
            </h2>
            <ol className="mt-6 space-y-5">
              {STEPS.map((s, i) => {
                const state = stepState(s.id);
                return (
                  <li key={s.id} className="flex gap-4">
                    <span
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center border font-mono text-[12px] ${state === "done" ? "border-ink bg-ink text-canvas" : state === "active" ? "border-ink" : "border-line text-muted"}`}
                    >
                      {state === "done" ? (
                        <Check className="size-4" aria-hidden />
                      ) : state === "active" ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div>
                      <p className={`font-medium ${state === "todo" ? "text-muted" : ""}`}>{s.label}</p>
                      <p className="mt-0.5 text-[14px] text-muted">{s.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 space-y-4" aria-live="polite">
              {service.kind === "starting" ? (
                <p role="status" className="text-[15px] text-muted">
                  Starting the verification service. It sleeps when idle and can take up to a minute to wake.
                </p>
              ) : service.kind === "not_configured" || service.kind === "unreachable" ? (
                <Notice tone="error" title="The verification service is not available">
                  <p>This example needs the CipherComply service to be running and configured.</p>
                </Notice>
              ) : (
                <Button onClick={run} disabled={!config || running}>
                  {running ? "Checking…" : granted ? "Check again" : "Prove eligibility"}
                </Button>
              )}

              {result?.kind === "granted" && (
                <Notice tone="success" title="Access granted">
                  <p>The chain shows a valid verification for an ID you control, until {formatDateTime(result.validUntil * 1000)}.</p>
                </Notice>
              )}
              {result?.kind === "denied" && (
                <Notice tone="warning" title={DENIED[result.reason].title}>
                  <p>{DENIED[result.reason].text}</p>
                </Notice>
              )}
              {result?.kind === "no_key" && (
                <Notice tone="warning" title="This browser has no verification key">
                  <p>The key is created the first time you verify, and it lives only in the browser you used. Verify here first, or open this page in that browser.</p>
                </Notice>
              )}
              {result?.kind === "rate_limited" && (
                <Notice tone="warning" title="Too many checks">
                  <p>Wait a minute and try again.</p>
                </Notice>
              )}
              {result?.kind === "error" && (
                <Notice tone="error" title="The check could not be completed">
                  <p>The service did not return a usable answer. Nothing was granted. Try again.</p>
                </Notice>
              )}
              {(result?.kind === "no_key" || result?.kind === "denied") && (
                <LinkButton href="/verify" variant="secondary">
                  Go to verification
                </LinkButton>
              )}
            </div>
          </section>
        </div>

        <section aria-labelledby="learned-heading" className="mt-16 border-t border-ink pt-10">
          <h2 id="learned-heading" className="annot text-muted">
            What this app can and cannot see
          </h2>
          <div className="mt-6 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="font-display text-2xl font-medium tracking-[-0.02em]">It learns</h3>
              <ul className="mt-4 divide-y divide-line border-y border-line text-[15px]">
                <li className="py-3">A pseudonymous ID, specific to this one contract</li>
                <li className="py-3">Whether that ID is verified, and until when</li>
                <li className="py-3">That you hold the key behind it</li>
              </ul>
              {result && "subject" in result && (
                <dl className="mt-5">
                  <Identifier label="The ID this app saw" value={result.subject} />
                </dl>
              )}
            </div>
            <div>
              <h3 className="font-display text-2xl font-medium italic tracking-[-0.02em]">It never sees</h3>
              <ul className="mt-4 divide-y divide-line border-y border-line text-[15px]">
                <li className="py-3">Your document</li>
                <li className="py-3">Your income or your name</li>
                <li className="py-3">Your wallet address or your CipherComply sign-in</li>
              </ul>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-[14px] text-muted">
            In this demo the example app and CipherComply are served from the same site, and the app&apos;s server performs the
            lookup. A real integrator would run these two calls on its own backend, or check the status inside its own Midnight
            contract.
          </p>
        </section>
      </main>
    </div>
  );
}
