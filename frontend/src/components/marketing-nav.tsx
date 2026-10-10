"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LinkButton, Logo } from "./ui";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#protocols", label: "For protocols" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 lg:px-12">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="CipherComply home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-[15px] text-ink/80 underline-offset-4 hover:text-ink hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="hidden px-3 text-[15px] font-medium underline-offset-4 hover:underline sm:inline">
            Log in
          </Link>
          <LinkButton href="/dashboard" className="min-h-10 px-5">
            Start verification
          </LinkButton>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface md:hidden"
            aria-expanded={open}
            aria-controls="main-menu"
            aria-label="Menu"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="main-menu" aria-label="Main" className="flex flex-col border-t border-line px-6 py-3 md:hidden">
          {[...LINKS, { href: "/dashboard", label: "Log in" }].map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-[16px]">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
