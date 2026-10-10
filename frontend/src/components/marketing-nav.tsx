"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EASE } from "./motion";
import { Logo } from "./ui";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#protocols", label: "For protocols" },
];

/** A ruled masthead. It hides while reading down and returns on the way up. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(y > 12);
    setHidden(y > 480 && y > previous);
  });

  return (
    <motion.header
      animate={reduce ? undefined : { y: hidden && !open ? "-100%" : 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`sticky top-0 z-40 border-b transition-colors duration-500 ${
        scrolled || open ? "border-line bg-canvas/90 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between gap-6 px-6 lg:px-12">
        <Link href="/" aria-label="CipherComply home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="annot link-draw text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="annot link-draw hidden text-ink sm:inline">
            Log in
          </Link>
          <Link href="/dashboard" className="group relative inline-flex h-11 items-center gap-3 overflow-hidden bg-ink pl-5 pr-3.5 text-[14px] font-medium text-surface">
            <span className="absolute inset-0 origin-bottom scale-y-0 bg-ink-soft transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-y-100" aria-hidden />
            <span className="relative">Start verification</span>
            <ArrowUpRight className="relative size-4 transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-45" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-11 items-center justify-center border border-line-strong md:hidden"
            aria-expanded={open}
            aria-controls="main-menu"
            aria-label="Menu"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="main-menu"
            aria-label="Main"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <div className="px-6 py-3">
              {[...LINKS, { href: "/dashboard", label: "Log in" }].map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block border-b border-line py-4 font-display text-2xl last:border-b-0">
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
