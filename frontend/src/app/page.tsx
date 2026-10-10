import { ArrowRight, FileText, Fingerprint, Network, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { Card, Details, Eyebrow, LinkButton, Logo } from "@/components/ui";

const STEPS = [
  { n: "1", title: "Submit evidence", body: "Choose the policy and upload the supported document it asks for." },
  { n: "2", title: "Evaluate eligibility", body: "An extraction pipeline reads the evidence; fixed policy rules decide the result." },
  { n: "3", title: "Generate proof", body: "Your client prepares the witness and proof the protocol requires." },
  { n: "4", title: "Confirm on-chain", body: "The app waits for the real transaction to finalize and the status to be indexed." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main>
        <section className="relative overflow-hidden">
          <HeroDecoration />
          <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center sm:pt-28 lg:pb-32">
            <Eyebrow>Private eligibility verification</Eyebrow>
            <h1 className="mt-6 text-[clamp(2.25rem,5.6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em]">
              Prove your eligibility.
              <br />
              Keep your documents private.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
              Verify sensitive evidence off-chain. Prove eligibility on-chain with zero-knowledge verification.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <LinkButton href="/dashboard" className="w-full sm:w-auto">
                Start verification
                <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <Link href="#how-it-works" className="text-[15px] font-medium underline-offset-4 hover:underline">
                How it works
              </Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-20 lg:px-12">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight">Four steps, each one visible to you.</h2>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n}>
                <Card as="div" className="h-full">
                  <span className="flex size-9 items-center justify-center rounded-full bg-neutral-soft text-[15px] font-semibold">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[15px] text-muted">{s.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-20 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>The privacy boundary</Eyebrow>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">What this does, and what it does not.</h2>
              <p className="mt-5 text-[17px] text-muted">
                The proof checks that an authorized attestation exists for you and meets the policy&apos;s constraints. It does
                not independently prove that the original document is genuine, or that the AI read it correctly. That part
                still rests on the service that reads the document.
              </p>
            </div>
            <div className="space-y-4">
              <Card as="div">
                <h3 className="text-lg font-semibold">Seen by the service</h3>
                <p className="mt-2 text-[15px] text-muted">
                  Your document is processed by the application server and its configured AI provider. Both can read it. You
                  are shown exactly which provider before you upload anything.
                </p>
              </Card>
              <Card as="div">
                <h3 className="text-lg font-semibold">Public on the ledger</h3>
                <p className="mt-2 text-[15px] text-muted">
                  Sensitive documents are not written to the public ledger. A pseudonymous identifier, a validity date and a
                  one-time marker are. Public chain data may be linkable to that identifier.
                </p>
              </Card>
              <Card as="div">
                <h3 className="text-lg font-semibold">Kept by you</h3>
                <p className="mt-2 text-[15px] text-muted">
                  The secret behind your identifier is created in your browser and is not sent to the server.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section id="protocols" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-20 lg:px-12">
          <Eyebrow>For protocols</Eyebrow>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight">Check a status, not a document.</h2>
          <p className="mt-5 max-w-2xl text-[17px] text-muted">
            A protocol reads one thing from the ledger: whether a pseudonymous subject holds a current verification under a
            named policy, and until when. It never receives the evidence behind it.
          </p>
          <div className="mt-10 max-w-3xl space-y-3">
            <Details title="Is this ready for production use?">
              No. This is a development build running against a Midnight test network. The contract has not had an independent
              security audit, and on-chain submission from a browser wallet is not built yet.
            </Details>
            <Details title="Does zero-knowledge prove my document is authentic?">
              No. It proves that a valid, unexpired, unused attestation from the authorized service exists for you. Whether the
              document was genuine and read correctly depends on that service.
            </Details>
            <Details title="Is it anonymous?">
              It is pseudonymous. Your identifier on the ledger is not your name, but it is persistent, and activity under it
              can be linked together.
            </Details>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-12">
          <Card as="div" className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Ready when you are.</h2>
              <p className="mt-1 text-[15px] text-muted">You will see the full data-processing disclosure before you upload.</p>
            </div>
            <LinkButton href="/dashboard" className="w-full sm:w-auto">
              Start verification
            </LinkButton>
          </Card>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-[14px] text-muted sm:flex-row sm:items-center sm:justify-between lg:px-12">
          <Logo />
          <p>Development build. Not audited. Test network only.</p>
        </div>
      </footer>
    </div>
  );
}

/** Abstract outline motifs at the edges only. Purely decorative, never interactive, hidden on small screens. */
function HeroDecoration() {
  const item = "absolute hidden text-ink/10 lg:block motion-safe:animate-drift";
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <FileText className={`${item} left-[6%] top-[18%] size-16`} strokeWidth={1} />
      <ShieldCheck className={`${item} right-[7%] top-[14%] size-20 [animation-delay:-4s]`} strokeWidth={1} />
      <Wallet className={`${item} left-[10%] bottom-[16%] size-14 [animation-delay:-8s]`} strokeWidth={1} />
      <Network className={`${item} right-[11%] bottom-[20%] size-16 [animation-delay:-2s]`} strokeWidth={1} />
      <Fingerprint className={`${item} left-[22%] top-[8%] size-10 [animation-delay:-6s]`} strokeWidth={1} />
    </div>
  );
}
