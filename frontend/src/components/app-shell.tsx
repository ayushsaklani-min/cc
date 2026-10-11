"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { setSessionToken } from "@/lib/store";
import { METHOD_LABEL } from "@/lib/copy";
import { useService } from "./service";
import { EASE } from "./motion";
import { Button, Card, Eyebrow, Logo, Notice, StatusBadge } from "./ui";
import { WalletButton } from "./wallet";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/verify", label: "Verify" },
  { href: "/privacy", label: "Privacy" },
  { href: "/example", label: "Example app" },
];

/** Network and wallet state as the server and browser actually report them. */
export function NetworkChip() {
  const { service } = useService();
  if (service.kind === "loading") return <StatusBadge tone="progress">Checking service</StatusBadge>;
  if (service.kind === "unreachable") return <StatusBadge tone="error">Service unreachable</StatusBadge>;
  if (service.kind === "not_configured") return <StatusBadge tone="warning">Not configured</StatusBadge>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="annot inline-flex items-center border border-line-strong px-3 py-1.5">
        Midnight {service.config.network}
      </span>
      <WalletButton compact />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session } = useService();
  const [open, setOpen] = useState(false);

  const links = NAV.map((item) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={`annot relative whitespace-nowrap py-2 text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-500 after:ease-[var(--ease-out)] ${active ? "after:scale-x-100" : "text-muted after:scale-x-0 hover:text-ink hover:after:scale-x-100"}`}
      >
        {item.label}
      </Link>
    );
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-6 lg:px-12">
          <Link href="/" aria-label="CipherComply home">
            <Logo />
          </Link>
          <nav aria-label="Workspace" className="hidden items-center gap-7 md:flex">
            {links}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <NetworkChip />
            </div>
            {session.kind === "signed_in" && (
              <button
                type="button"
                onClick={() => setSessionToken(null)}
                className="inline-flex size-10 items-center justify-center border border-line-strong hover:bg-neutral-soft"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex size-10 items-center justify-center border border-line-strong lg:hidden"
              aria-expanded={open}
              aria-controls="workspace-menu"
              aria-label="Menu"
            >
              {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="workspace-menu" aria-label="Workspace" className="flex flex-col gap-1 border-t border-line px-6 py-3 lg:hidden">
            {links}
            <div className="pt-2">
              <NetworkChip />
            </div>
          </nav>
        )}
      </header>
      <main className="relative mx-auto max-w-6xl px-6 py-10 lg:px-12 lg:py-14">
        <PageTransition routeKey={pathname}>
          <Gate>{children}</Gate>
        </PageTransition>
      </main>
    </div>
  );
}

/** Content settles into place on each navigation. */
function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div key={routeKey} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Shows the workspace only with a reachable service and a valid session. */
function Gate({ children }: { children: ReactNode }) {
  const { service, session, reload } = useService();

  if (service.kind === "loading" || session.kind === "loading") {
    return (
      <p role="status" className="text-muted">
        Loading…
      </p>
    );
  }
  if (service.kind === "unreachable") {
    return (
      <div className="max-w-xl space-y-4">
        <Notice tone="error" title="The verification service could not be reached.">
          Nothing has been submitted. Check your connection and try again.
        </Notice>
        <Button variant="secondary" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }
  if (service.kind === "not_configured") {
    return (
      <div className="max-w-xl space-y-4">
        <Notice tone="warning" title="Verification is not available yet.">
          This deployment has no verification contract configured, so documents cannot be submitted. This is a setup step for the
          operator, not something you can fix from here.
        </Notice>
        <Button variant="secondary" onClick={reload}>
          Check again
        </Button>
      </div>
    );
  }
  if (session.kind !== "signed_in") return <SignIn state={session.kind} />;
  return <>{children}</>;
}

function SignIn({ state }: { state: "signed_out" | "invalid" | "unavailable" }) {
  const [value, setValue] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) setSessionToken(value.trim());
  };
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <Eyebrow>Development sign-in</Eyebrow>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-[-0.03em]">Sign in to continue</h1>
        <p className="mt-3 text-[15px] text-muted">
          This build has no production sign-in yet. Paste a development access token issued by the operator. It is kept only for
          this browser tab.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="token" className="text-[14px] font-medium">
              Access token
            </label>
            <input
              id="token"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-describedby={state === "signed_out" ? undefined : "token-error"}
              aria-invalid={state === "invalid"}
              className="mt-1.5 block h-12 w-full border border-line-strong bg-surface px-4 font-mono text-[14px] focus:border-ink"
            />
            {state === "invalid" && (
              <p id="token-error" className="mt-2 text-[14px] text-error">
                That token was not accepted. Check it and try again.
              </p>
            )}
            {state === "unavailable" && (
              <p id="token-error" className="mt-2 text-[14px] text-error">
                The session could not be checked. Try again in a moment.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!value.trim()}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function SessionSummary() {
  const { session } = useService();
  if (session.kind !== "signed_in") return null;
  return (
    <>
      {METHOD_LABEL[session.info.method] ?? session.info.method}
      {session.info.hasVerifiedName ? "" : " (no verified name)"}
    </>
  );
}
