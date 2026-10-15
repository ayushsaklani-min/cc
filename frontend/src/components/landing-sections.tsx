// Landing sections below the hero. Copy states only what the system does;
// every figure shown is a fixed property of the protocol, not a usage statistic,
// and the schematics contain no sample data.
"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { CountUp, EASE, Reveal, SpotlightCard, Stagger, StaggerItem } from "./motion";
import { Logo } from "./ui";

// Stable references: a new array on every render would restart scroll tracking.
const PASS_THROUGH: ["start end", "end start"] = ["start end", "end start"];
const PINNED: ["start start", "end end"] = ["start start", "end end"];

const SHELL = "mx-auto max-w-[88rem] px-6 lg:px-12";
const H2 = "font-display text-[clamp(2.6rem,6vw,5.5rem)] font-normal leading-[0.94] tracking-[-0.03em]";

function SectionLabel({ index, children, onInk = false }: { index: string; children: ReactNode; onInk?: boolean }) {
  return (
    <p className={`annot flex items-center gap-3 ${onInk ? "text-on-ink-muted" : "text-muted"}`}>
      <span className={onInk ? "text-on-ink" : "text-ink"}>§ {index}</span>
      <span className={`h-px w-10 ${onInk ? "bg-on-ink-line" : "bg-line-strong"}`} aria-hidden />
      {children}
    </p>
  );
}

/* ---------- A band of type that travels with the scroll ---------- */

const REPEATS = [0, 1, 2, 3, 4, 5];

export function ScrollMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: PASS_THROUGH });
  const left = useTransform(scrollYProgress, [0, 1], ["-3%", "-24%"]);
  const right = useTransform(scrollYProgress, [0, 1], ["-24%", "-3%"]);
  const row = "flex w-max items-center whitespace-nowrap font-display leading-[1.05] tracking-[-0.03em] text-[clamp(3rem,9.5vw,8rem)]";
  return (
    <div ref={ref} aria-hidden className="overflow-hidden bg-ink py-10 text-on-ink sm:py-14">
      <motion.div style={reduce ? undefined : { x: left }} className={row}>
        {REPEATS.map((i) => (
          <span key={i} className="flex items-center">
            Prove the result
            <span className="mx-[0.4em] inline-block h-px w-[0.9em] bg-on-ink-muted" />
          </span>
        ))}
      </motion.div>
      <motion.div style={reduce ? undefined : { x: right }} className={`${row} italic text-on-ink-muted`}>
        {REPEATS.map((i) => (
          <span key={i} className="flex items-center">
            not the document
            <span className="mx-[0.4em] inline-block h-px w-[0.9em] bg-on-ink-line" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- How it works: pinned on large screens, driven by scroll ---------- */

const STEPS = [
  {
    title: "Submit evidence",
    body: "Choose the policy and upload the supported document it asks for. Before anything is sent, you are shown exactly who will process it.",
    detail: "PDF, PNG or JPEG",
  },
  {
    title: "Evaluate eligibility",
    body: "An extraction pipeline reads the evidence. Fixed, versioned policy rules decide the result. The model never makes the decision.",
    detail: "Deterministic rules, integer arithmetic",
  },
  {
    title: "Generate proof",
    body: "Your client prepares the witness and the zero-knowledge proof the protocol requires, using a secret that never leaves your browser.",
    detail: "Proved on your side",
  },
  {
    title: "Confirm on-chain",
    body: "The app waits for the real transaction to finalize and for the status to be indexed. Only then does it say you are verified.",
    detail: "No status without finality",
  },
];

/** The checks the policy engine actually applies, in order. */
const RULES = ["Document type", "Issuer", "Holder name", "Document date", "Amount against threshold"];

/** One abstract drawing per step. Shapes only: no figures, names or hashes. */
function Schematic({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const drawn = (delay: number) => ({
    initial: reduce ? false : ({ scaleX: 0 } as const),
    animate: { scaleX: 1 },
    transition: { duration: 0.7, ease: [0.7, 0, 0.2, 1] as const, delay },
  });

  if (step === 0) {
    return (
      <div className="mx-auto w-[58%] border border-ink bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5 h-2 w-1/3 bg-ink" />
        {[92, 78, 86, 60, 82, 48].map((w, i) => (
          <motion.div key={i} {...drawn(0.1 + i * 0.07)} className="mb-2.5 h-[7px] origin-left bg-line-strong" style={{ width: `${w}%` }} />
        ))}
        <p className="annot mt-6 text-muted">Your document</p>
      </div>
    );
  }
  if (step === 1) {
    return (
      <ul className="mx-auto w-[78%] border-t border-ink">
        {RULES.map((rule, i) => (
          <motion.li
            key={rule}
            initial={reduce ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.09 }}
            className="flex items-center justify-between border-b border-line py-3.5"
          >
            <span className="annot">{rule}</span>
            <span className="flex size-5 items-center justify-center bg-ink text-surface">
              <Check className="size-3" strokeWidth={2.5} aria-hidden />
            </span>
          </motion.li>
        ))}
      </ul>
    );
  }
  if (step === 2) {
    return (
      <div className="mx-auto grid w-[88%] grid-cols-[1fr_auto_1fr] items-center gap-5">
        <div className="border border-dashed border-line-strong bg-surface p-5">
          <p className="annot text-muted">Stays in your browser</p>
          {[70, 88, 54].map((w, i) => (
            <motion.div key={i} {...drawn(0.1 + i * 0.08)} className="mt-3 h-[9px] origin-left bg-ink" style={{ width: `${w}%` }} />
          ))}
        </div>
        <motion.div {...drawn(0.4)} className="h-px w-12 origin-left bg-ink" />
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.55 }}
          className="flex aspect-square items-center justify-center bg-ink text-surface"
        >
          <p className="annot">Proof</p>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-[86%] items-center">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 items-center last:flex-none">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.14 }}
            className={`flex size-16 shrink-0 items-center justify-center border ${i === 3 ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface"}`}
          >
            {i === 3 ? <Check className="size-5" aria-hidden /> : <span className="annot text-muted">Block</span>}
          </motion.div>
          {i < 3 && <motion.div {...drawn(0.2 + i * 0.14)} className="h-px flex-1 origin-left bg-ink" />}
        </div>
      ))}
    </div>
  );
}

export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: PINNED });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)))));
  const step = STEPS[active] ?? STEPS[0];

  const heading = (
    <>
      <SectionLabel index="01">How it works</SectionLabel>
      <h2 className={`${H2} mt-7`}>
        Four steps.
        <br />
        <em>Each one visible.</em>
      </h2>
      <p className="mt-7 max-w-md text-[17px] leading-relaxed text-muted">
        Nothing advances on a timer. Every stage you see in the product is the result of a real response, a real proof, or a
        finalized transaction.
      </p>
    </>
  );

  return (
    <section id="how-it-works" className="scroll-mt-8 border-b border-line">
      {/* Small screens: a plain list. Every step is fully readable without scrolling tricks. */}
      <div className={`${SHELL} py-24 lg:hidden`}>
        <Reveal>{heading}</Reveal>
        <Stagger as="ol" className="mt-12 border-t border-ink">
          {STEPS.map((s, i) => (
            <StaggerItem as="li" key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 border-b border-line py-7">
              <span className="font-display text-5xl italic leading-none text-muted">{i + 1}</span>
              <div>
                <h3 className="font-display text-3xl leading-tight tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
                <p className="annot mt-4 text-ink">{s.detail}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {/* Large screens: the section pins and one step is shown at a time, chosen by scroll position. */}
      <div ref={ref} className="relative hidden h-[320vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center pt-16">
          <div className={`${SHELL} grid w-full grid-cols-12 items-center gap-10`}>
            <div className="col-span-5">
              {heading}
              <ol className="mt-12 border-t border-line">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="relative flex items-baseline gap-5 border-b border-line py-3.5" aria-current={i === active ? "step" : undefined}>
                    <span className={`annot transition-colors duration-300 ${i === active ? "text-ink" : "text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={`font-display text-[1.6rem] leading-none tracking-[-0.02em] transition-all duration-500 ease-[var(--ease-out)] ${i === active ? "translate-x-2 italic text-ink" : "text-muted"}`}>
                      {s.title}
                    </span>
                    {i === active && <motion.span layoutId="step-marker" className="absolute -bottom-px left-0 h-px w-full bg-ink" transition={{ duration: 0.5, ease: EASE }} />}
                  </li>
                ))}
              </ol>
            </div>

            <div className="col-span-7 col-start-6 pl-8">
              <div className="crop relative h-[30rem] overflow-hidden border border-line bg-canvas">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={reduce ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -24 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="absolute inset-0 grid grid-rows-[1fr_auto]"
                  >
                    <div className="flex items-center px-10 pt-10">
                      <div className="w-full">
                        <Schematic step={active} />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-end gap-8 border-t border-line bg-surface/85 px-8 py-6 backdrop-blur-sm">
                      <p className="max-w-md text-[15px] leading-relaxed text-muted">{step.body}</p>
                      <p className="annot text-right text-ink">{step.detail}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-5 flex items-center gap-4" aria-hidden>
                <span className="annot tabular-nums">{String(active + 1).padStart(2, "0")}</span>
                <span className="relative h-px flex-1 bg-line-strong">
                  <motion.span className="absolute inset-0 origin-left bg-ink" style={reduce ? undefined : { scaleX: progress }} />
                </span>
                <span className="annot tabular-nums text-muted">{String(STEPS.length).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- The privacy boundary: a disclosure schedule on the dark zone ---------- */

type Mark = "yes" | "no";
const SCHEDULE: { item: string; note?: string; service: Mark; apps: Mark; ledger: Mark; you: Mark }[] = [
  { item: "Your document", service: "yes", apps: "no", ledger: "no", you: "yes" },
  { item: "What it says: income, date of birth, name", service: "yes", apps: "no", ledger: "no", you: "yes" },
  { item: "Your wallet address", note: "Pays the fee, but is not recorded as the verified party", service: "no", apps: "no", ledger: "no", you: "yes" },
  { item: "A pseudonymous identifier", note: "Persistent, so activity under it can be linked", service: "yes", apps: "yes", ledger: "yes", you: "yes" },
  { item: "Whether you are verified, and until when", service: "yes", apps: "yes", ledger: "yes", you: "yes" },
  { item: "A one-time marker per attestation", service: "yes", apps: "no", ledger: "yes", you: "yes" },
  { item: "The secret key behind your identifier", note: "Created in your browser, never sent", service: "no", apps: "no", ledger: "no", you: "yes" },
];

function Cell({ mark, label }: { mark: Mark; label: string }) {
  return (
    <td className="w-[13%] py-5 text-center align-middle">
      {mark === "yes" ? (
        <span className="mx-auto flex size-6 items-center justify-center bg-on-ink text-ink">
          <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
      ) : (
        <Minus className="mx-auto size-4 text-on-ink-muted/60" aria-hidden />
      )}
      <span className="sr-only">{mark === "yes" ? `${label}: yes` : `${label}: no`}</span>
    </td>
  );
}

export function Boundary() {
  return (
    <section id="privacy" className="relative scroll-mt-8 overflow-hidden bg-ink text-on-ink">
      <div className={`${SHELL} relative py-28 lg:py-40`}>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <Reveal from="left" className="lg:col-span-7">
            <SectionLabel index="02" onInk>
              The privacy boundary
            </SectionLabel>
            <h2 className={`${H2} mt-7`}>
              One checker sees it, once.
              <br />
              <em className="text-on-ink-muted">Apps and the chain never do.</em>
            </h2>
          </Reveal>
          <Reveal from="right" delay={0.1} className="lg:col-span-4 lg:col-start-9">
            <p className="text-[17px] leading-relaxed text-on-ink-muted">
              Zero-knowledge proofs cannot read a document, so something has to check it first. Here that is the CipherComply
              service, once. Every app that needs to know you qualify gets a yes or no instead of your file. For the over-18 policy
              the check uses no AI: the issuer&apos;s digital signature is verified and the record is read by fixed rules.
            </p>
          </Reveal>
        </div>

        <Reveal className="mt-20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">Who can see each piece of information</caption>
              <thead>
                <tr className="border-b border-on-ink">
                  <th scope="col" className="annot pb-4 font-normal text-on-ink-muted">
                    Schedule of disclosure
                  </th>
                  <th scope="col" className="annot pb-4 text-center font-normal">
                    The service
                  </th>
                  <th scope="col" className="annot pb-4 text-center font-normal">
                    Apps that check you
                  </th>
                  <th scope="col" className="annot pb-4 text-center font-normal">
                    Public ledger
                  </th>
                  <th scope="col" className="annot pb-4 text-center font-normal">
                    You
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULE.map((row) => (
                  <tr key={row.item} className="group border-b border-on-ink-line transition-colors duration-300 hover:bg-on-ink/[0.04]">
                    <th scope="row" className="py-5 pr-6 font-normal">
                      <span className="font-display text-[1.45rem] leading-tight tracking-[-0.015em] sm:text-[1.7rem]">{row.item}</span>
                      {row.note && <span className="mt-1 block text-[14px] text-on-ink-muted">{row.note}</span>}
                    </th>
                    <Cell mark={row.service} label="The service" />
                    <Cell mark={row.apps} label="Apps that check you" />
                    <Cell mark={row.ledger} label="Public ledger" />
                    <Cell mark={row.you} label="You" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="annot mt-6 max-w-2xl leading-relaxed text-on-ink-muted">
            The service means the CipherComply server and, for the income policy only, the AI provider that reads the document. An
            app can also read anything on the public ledger. Ledger entries are permanent and readable by anyone.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Fixed properties of the protocol ---------- */

const FACTS = [
  { value: 0, unit: "", label: "documents written to the public ledger" },
  { value: 13, unit: "", label: "fields bound together by one signature" },
  { value: 15, unit: "min", label: "to submit an attestation before it expires" },
  { value: 1, unit: "use", label: "per attestation, then never again" },
];

export function Facts() {
  return (
    <section className="border-b border-line">
      <div className={`${SHELL} py-24 lg:py-32`}>
        <div className="flex items-end justify-between gap-6">
          <Reveal>
            <SectionLabel index="03">By design</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="annot text-right text-muted">Properties of the protocol, not usage figures</p>
          </Reveal>
        </div>
        <Stagger as="dl" className="mt-12 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <StaggerItem key={f.label} className="flex flex-col justify-between border-b border-r border-line p-7 lg:min-h-[19rem] lg:p-9">
              <dd className="order-1 font-display text-[clamp(5rem,9vw,8.5rem)] font-normal leading-[0.85] tracking-[-0.04em] tabular-nums">
                <CountUp value={f.value} />
                {f.unit && <span className="annot ml-3 align-top text-muted">{f.unit}</span>}
              </dd>
              <dt className="order-2 mt-8 max-w-[15rem] text-[15px] leading-snug text-muted">{f.label}</dt>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- For protocols ---------- */

export function Protocols() {
  return (
    <section id="protocols" className="scroll-mt-8 border-b border-line">
      <div className={`${SHELL} grid gap-14 py-24 lg:grid-cols-12 lg:items-center lg:py-36`}>
        <Reveal from="left" className="lg:col-span-6">
          <SectionLabel index="04">For protocols</SectionLabel>
          <h2 className={`${H2} mt-7`}>
            Check a status,
            <br />
            <em>not a document.</em>
          </h2>
          <p className="mt-7 max-w-md text-[17px] leading-relaxed text-muted">
            A protocol reads one thing: whether a pseudonymous subject holds a current verification under a named policy, and until
            when. It never receives the evidence behind it.
          </p>
        </Reveal>

        <Reveal from="right" delay={0.1} className="lg:col-span-5 lg:col-start-8">
          <SpotlightCard className="crop border border-ink bg-surface shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <span className="annot">Status request</span>
              <span className="annot text-muted">Shape of the API</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-[13.5px] leading-8 sm:p-7">
              <code>
                <span className="bg-ink px-2 py-1 text-surface">GET</span> /v1/status/<span className="text-muted">{"{subject}"}</span>
                {"\n\n"}
                <span className="text-muted">200</span>
                {"\n"}
                {"{\n"}
                {"  "}&quot;verified&quot;: <span className="text-muted">boolean</span>,{"\n"}
                {"  "}&quot;validUntil&quot;: <span className="text-muted">unix seconds</span>
                {"\n}\n\n"}
                <span className="text-muted">404  no confirmed verification</span>
              </code>
            </pre>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Questions ---------- */

const QUESTIONS = [
  {
    q: "Is this ready for production use?",
    a: "No. This is a development build running against a Midnight test network. The contract has not had an independent security audit, and sign-in is a development stand-in.",
  },
  {
    q: "If the server sees my document, what is the benefit?",
    a: "Without it, proving one fact to five apps means sending your document to all five, and each keeps a copy. Here one checker sees it once and keeps only a keyed fingerprint. The apps and the public ledger get a yes or no for an identifier that is not your name or your wallet, and you can reuse that result without uploading again. It is not zero trust: you trust the checker. Moving that check into signed data sources and a sealed enclave is the next step.",
  },
  {
    q: "Does zero-knowledge prove my document is authentic?",
    a: "Not by itself. It proves that a valid, unexpired, unused attestation from the authorized service exists for you. For the over-18 policy, authenticity comes from the issuer: a record whose DigiLocker signature does not verify is refused. For the income policy, it depends on the service reading the document correctly.",
  },
  {
    q: "Is it anonymous?",
    a: "It is pseudonymous. Your identifier on the ledger is not your name, but it is persistent, and activity under it can be linked together.",
  },
  {
    q: "Who can see my document?",
    a: "The CipherComply server, and for the income policy also the AI provider it uses. You are shown which provider, which model, and what that provider may do with the document before you upload anything, and must acknowledge it. The over-18 policy sends nothing to an AI provider.",
  },
];

export function Questions() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  return (
    <section className="border-b border-line">
      <div className={`${SHELL} grid gap-12 py-24 lg:grid-cols-12 lg:py-36`}>
        <Reveal className="lg:col-span-4">
          <SectionLabel index="05">Questions</SectionLabel>
          <h2 className={`${H2} mt-7`}>
            Plain
            <br />
            <em>answers.</em>
          </h2>
        </Reveal>
        <Stagger className="border-t border-ink lg:col-span-7 lg:col-start-6" gap={0.07}>
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <StaggerItem key={item.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`answer-${i}`}
                    className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-7 text-left"
                  >
                    <span className="annot text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className={`font-display text-2xl leading-tight tracking-[-0.02em] transition-all duration-500 ease-[var(--ease-out)] sm:text-[2rem] ${isOpen ? "italic" : "group-hover:translate-x-1.5"}`}>
                      {item.q}
                    </span>
                    <span className={`flex size-9 items-center justify-center self-center border transition-colors duration-300 ${isOpen ? "border-ink bg-ink text-surface" : "border-line-strong"}`}>
                      <Plus className={`size-4 transition-transform duration-500 ease-[var(--ease-out)] ${isOpen ? "rotate-[135deg]" : ""}`} aria-hidden />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`answer-${i}`}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-xl pb-8 pl-14 text-[17px] leading-relaxed text-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- Closing call to action and footer ---------- */

export function Closing() {
  return (
    <>
      <section className="relative">
        <div className={`${SHELL} relative py-32 text-center lg:py-48`}>
          <Reveal>
            <p className="annot text-muted">Begin</p>
            <h2 className="mt-8 font-display text-[clamp(3.25rem,11vw,10.5rem)] font-normal leading-[0.86] tracking-[-0.04em]">
              Ready when
              <br />
              <em>you are.</em>
            </h2>
            <p className="mx-auto mt-9 max-w-md text-[17px] text-muted">
              You will see the full data-processing disclosure before you upload anything.
            </p>
            <Link href="/dashboard" className="group relative mt-11 inline-flex h-16 items-center gap-8 overflow-hidden bg-ink pl-9 pr-6 text-[16px] font-medium text-surface">
              <span className="absolute inset-0 origin-bottom scale-y-0 bg-ink-soft transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-y-100" aria-hidden />
              <span className="relative">Start verification</span>
              <span className="relative flex size-9 items-center justify-center border border-surface/25 transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-45">
                <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>
      <footer className="border-t border-ink">
        <div className={`${SHELL} grid gap-6 py-9 sm:grid-cols-[1fr_auto] sm:items-center`}>
          <Logo />
          <p className="annot text-muted">Development build · Not audited · Test network only</p>
        </div>
      </footer>
    </>
  );
}
