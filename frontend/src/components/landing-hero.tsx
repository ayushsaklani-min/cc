// Landing hero. The headline redacts its own noun; beside it, a specimen
// attestation shows the idea in one glance: everything about you is covered,
// only the result is legible. The specimen holds no sample data at all — the
// covered fields are bars, not hidden text.
"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { EASE } from "./motion";

const HERO_OFFSET: ["start start", "end start"] = ["start start", "end start"];

const rise = {
  hidden: { y: "110%" },
  shown: (i: number) => ({ y: 0, transition: { duration: 1.1, ease: EASE, delay: 0.1 + i * 0.13 } }),
};
const fade = {
  hidden: { opacity: 0, y: 14 },
  shown: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE, delay: 0.6 + i * 0.1 } }),
};

/** A masked line that slides up into place. */
function Line({ i, children }: { i: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <span className="-mb-[0.16em] block overflow-hidden pb-[0.16em]">
      <motion.span className="block" initial={reduce ? false : "hidden"} animate="shown" custom={i} variants={rise}>
        {children}
      </motion.span>
    </span>
  );
}

/**
 * A word covered by a redaction bar. The bar sweeps on after the headline has
 * landed and lifts while the pointer is over it. The heading carries the full
 * sentence as its accessible name.
 */
function Redacted({ children, delay }: { children: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="group/redact relative inline-block cursor-default">
      {children}
      <motion.span
        aria-hidden
        className="absolute inset-x-[-0.05em] bottom-[-0.09em] top-[0.11em] bg-ink transition-[clip-path] duration-700 ease-[var(--ease-out)] [clip-path:inset(0_0_0_0)] group-hover/redact:[clip-path:inset(0_0_0_100%)]"
        style={{ originX: 0 }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1], delay }}
      />
    </span>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: HERO_OFFSET });
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const initial = reduce ? false : "hidden";

  return (
    <section ref={ref} className="relative overflow-hidden border-b border-line">
      <div className="relative mx-auto max-w-[88rem] px-6 pt-12 lg:px-12 lg:pt-16">
        <motion.p initial={initial} animate="shown" custom={0} variants={fade} className="annot flex items-center gap-3 text-muted">
          <span className="text-ink">N° 001</span>
          <span className="h-px w-10 bg-line-strong" aria-hidden />
          Private eligibility verification
        </motion.p>

        <h1
          aria-label="Prove your eligibility. Keep your documents private."
          className="mt-8 font-display text-[clamp(2.9rem,8.1vw,7.4rem)] font-normal leading-[0.92] tracking-[-0.035em]"
        >
          <span aria-hidden>
            <Line i={0}>
              Prove your <em>eligibility.</em>
            </Line>
            <Line i={1}>
              Keep your <Redacted delay={1.9}>documents</Redacted>
            </Line>
            <Line i={2}>
              <em>private.</em>
            </Line>
          </span>
        </h1>

        <div className="grid gap-12 pb-16 pt-10 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-0">
          <div className="lg:col-span-6 lg:pt-12">
            <motion.p initial={initial} animate="shown" custom={2} variants={fade} className="max-w-md text-[18px] leading-relaxed text-muted">
              Verify sensitive evidence off-chain. Prove eligibility on-chain with zero-knowledge verification.
            </motion.p>
            <motion.div initial={initial} animate="shown" custom={3} variants={fade} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
              <Link href="/dashboard" className="group relative inline-flex h-14 items-center gap-6 overflow-hidden bg-ink pl-7 pr-5 text-[15px] font-medium text-surface">
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-ink-soft transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-y-100" aria-hidden />
                <span className="relative">Start verification</span>
                <span className="relative flex size-8 items-center justify-center border border-surface/25 transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-45">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </Link>
              <Link href="#how-it-works" className="link-draw text-[15px] font-medium">
                How it works
              </Link>
            </motion.div>
          </div>

          {/* The specimen sits beside the last line of the headline on wide screens, clear of the type. */}
          <motion.div style={reduce ? undefined : { y: cardY }} className="lg:col-span-4 lg:col-start-9 lg:-mt-16">
            <motion.figure
              initial={reduce ? false : { opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.3, ease: EASE, delay: 0.95 }}
              className="crop mx-auto max-w-[24rem] border border-ink bg-surface p-6 shadow-[var(--shadow-lift)] sm:p-7"
              aria-label="Illustration of an attestation: the subject, the document and the income are covered; only the result is readable."
            >
              <div className="flex items-start justify-between">
                <p className="annot">Attestation</p>
                <p className="annot text-muted">Specimen</p>
              </div>
              <dl className="mt-7 space-y-4">
                {(
                  [
                    ["Subject", 62],
                    ["Document", 80],
                    ["Income", 44],
                  ] as const
                ).map(([label, width], i) => (
                  <div key={label} className="grid grid-cols-[5.5rem_1fr] items-center gap-4">
                    <dt className="annot text-muted">{label}</dt>
                    <dd>
                      <motion.span
                        className="block h-[14px] bg-ink"
                        style={{ width: `${width}%`, originX: 0 }}
                        initial={reduce ? false : { scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, ease: [0.7, 0, 0.2, 1], delay: 1.6 + i * 0.14 }}
                      />
                      <span className="sr-only">not shown</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex items-end justify-between gap-4 border-t border-ink pt-5">
                <div>
                  <p className="annot text-muted">Result</p>
                  <p className="mt-1 font-display text-[2.4rem] italic leading-none tracking-[-0.02em]">Eligible</p>
                </div>
                <p className="annot max-w-[9rem] text-right text-muted">The only line anyone else can read</p>
              </div>
            </motion.figure>
          </motion.div>
        </div>
      </div>

      {/* Colophon strip. */}
      <motion.dl
        initial={initial}
        animate="shown"
        custom={5}
        variants={fade}
        className="relative mx-auto grid max-w-[88rem] grid-cols-2 border-t border-line px-6 lg:grid-cols-4 lg:px-12"
      >
        {(
          [
            ["Evidence", "Stays off-chain"],
            ["Decision", "Fixed policy rules"],
            ["Proof", "Zero-knowledge"],
            ["Network", "Midnight test network"],
          ] as const
        ).map(([k, v], i) => (
          <div
            key={k}
            className={`py-5 ${i % 2 === 1 ? "max-lg:border-l max-lg:border-line max-lg:pl-6" : ""} ${i > 1 ? "max-lg:border-t max-lg:border-line" : ""} ${i > 0 ? "lg:border-l lg:border-line lg:pl-6" : ""}`}
          >
            <dt className="annot text-muted">{k}</dt>
            <dd className="mt-1.5 text-[15px] font-medium">{v}</dd>
          </div>
        ))}
      </motion.dl>
    </section>
  );
}
