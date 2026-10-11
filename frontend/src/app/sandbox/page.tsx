"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { ScenarioResult } from "../../../../lib/sandbox";
import { SCENARIO_INFO, type ScenarioInfo } from "../../../../lib/sandbox-scenarios";

/** The contract and its runtime carry WebAssembly, so they load only when first needed. */
const loadSandbox = () => import("../../../../lib/sandbox");

const GROUPS: { id: ScenarioInfo["group"]; title: string; note: string }[] = [
  { id: "honest", title: "Honest use", note: "What the contract is for." },
  { id: "attack", title: "Attacks", note: "Each one is a real attempt on the real circuit. All of them should be refused." },
  { id: "admin", title: "Revocation", note: "Only the admin can revoke, and an old attestation cannot undo a revocation." },
];

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;

function Row({ scenario, result, running, onRun }: { scenario: ScenarioInfo; result: ScenarioResult | undefined; running: boolean; onRun(): void }) {
  return (
    <li className="grid gap-4 border-b border-line py-6 md:grid-cols-[1fr_auto] md:gap-10">
      <div className="min-w-0">
        <h3 className="font-display text-2xl font-medium tracking-[-0.02em]">{scenario.title}</h3>
        <p className="mt-1.5 text-[15px] text-muted">{scenario.attempt}</p>
        {result && (
          <div className="mt-4" aria-live="polite">
            <p className="flex flex-wrap items-center gap-3">
              <span className={`annot px-2.5 py-1 ${result.outcome === "accepted" ? "border border-ink text-ink" : "bg-ink text-canvas"}`}>
                {result.outcome === "accepted" ? "Accepted" : "Refused"}
              </span>
              {result.message && <code className="font-mono text-[14px]">{result.message}</code>}
            </p>
            <p className="mt-3 font-mono text-[13px] text-muted">
              Ledger after: {result.ledger.verified.length} verified · {result.ledger.revoked.length} revoked ·{" "}
              {result.ledger.nullifiersUsed} nullifier{result.ledger.nullifiersUsed === 1 ? "" : "s"} used
              {result.ledger.verified[0] ? ` · subject ${short(result.ledger.verified[0].subject)}` : ""}
            </p>
            {!result.asExpected && (
              <p role="alert" className="mt-3 border-l-2 border-current pl-3 text-[14px] font-semibold">
                This is not the result the contract is designed to give. Expected: {scenario.expected}.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="md:pt-1">
        <Button variant="secondary" onClick={onRun} disabled={running}>
          {result ? "Run again" : "Run"}
        </Button>
      </div>
    </li>
  );
}

export default function SandboxPage() {
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(ids?: string[]) {
    setRunning(true);
    setFailed(false);
    try {
      const sandbox = await loadSandbox();
      for (const scenario of sandbox.SCENARIOS) {
        if (ids && !ids.includes(scenario.id)) continue;
        const result = sandbox.runScenario(scenario);
        setResults((r) => ({ ...r, [scenario.id]: result }));
        // Let the page paint between scenarios.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  }

  const done = Object.values(results);
  const refused = done.filter((r) => r.outcome === "refused").length;
  const unexpected = done.filter((r) => !r.asExpected).length;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-ink text-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 lg:px-12">
          <p className="annot">Sandbox · runs in your browser · no wallet, no network</p>
          <Link href="/" className="annot link-draw">
            Back to CipherComply
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14 lg:px-12 lg:py-20">
        <p className="annot text-muted">The compiled contract, on your machine</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[0.98] tracking-[-0.035em] sm:text-6xl">
          Try to <em className="italic">break it</em>
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted">
          Each button deploys a fresh copy of the CipherComply contract inside this tab and runs one scenario against it:
          three legitimate actions, and eleven ways someone might cheat. What you see is the contract&apos;s own answer.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button onClick={() => run()} disabled={running}>
            {running ? "Running…" : done.length > 0 ? "Run all again" : "Run all 14 scenarios"}
          </Button>
          {done.length > 0 && (
            <p className="font-mono text-[14px]" aria-live="polite">
              {done.length} run · {done.length - refused} accepted · {refused} refused
              {unexpected > 0 ? ` · ${unexpected} unexpected` : " · all as designed"}
            </p>
          )}
        </div>
        {failed && (
          <p role="alert" className="mt-4 border-l-2 border-current pl-3 text-[15px]">
            The contract runtime could not be loaded in this browser, so nothing was run.
          </p>
        )}

        {GROUPS.map((group) => {
          const list = SCENARIO_INFO.filter((s) => s.group === group.id);
          return (
            <section key={group.id} aria-labelledby={`${group.id}-heading`} className="mt-14">
              <div className="border-b border-ink pb-3">
                <h2 id={`${group.id}-heading`} className="annot">
                  {group.title}
                </h2>
                <p className="mt-1 text-[14px] text-muted">{group.note}</p>
              </div>
              <ul>
                {list.map((scenario) => (
                  <Row key={scenario.id} scenario={scenario} result={results[scenario.id]} running={running} onRun={() => run([scenario.id])} />
                ))}
              </ul>
            </section>
          );
        })}

        <section aria-labelledby="honesty-heading" className="mt-16 border-t border-ink pt-8">
          <h2 id="honesty-heading" className="annot text-muted">
            What this is, and what it is not
          </h2>
          <ul className="mt-4 max-w-3xl space-y-2 text-[15px] text-muted">
            <li>It runs the same compiled contract code that is deployed on Midnight Preview, against the same runtime.</li>
            <li>It does not generate or verify a zero-knowledge proof, and it does not touch a network. No proof server is involved.</li>
            <li>The oracle, admin and user keys are throwaway keys created in this tab. Nothing is uploaded and no document is read.</li>
            <li>
              For the real thing, with proofs and settled transactions, see the{" "}
              <a className="underline underline-offset-4" href="https://github.com/ayushsaklani-min/cc/blob/phase-0-validation/PROOF.md">
                on-chain evidence
              </a>
              .
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
