// Shared primitives: Button, Card, StatusBadge, Eyebrow, CopyButton, Details.
"use client";

import { Check, ChevronDown, CircleAlert, CircleCheck, CircleDashed, CircleX, Copy, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ButtonHTMLAttributes, type ComponentProps, type HTMLAttributes, type ReactNode } from "react";
import type { Tone } from "@/lib/copy";

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_VARIANT = {
  primary: "bg-ink text-surface hover:bg-ink/85 active:bg-ink/75",
  secondary: "border border-line bg-surface text-ink hover:bg-neutral-soft active:bg-line",
  quiet: "px-3 text-ink underline-offset-4 hover:underline",
};

type Variant = keyof typeof BUTTON_VARIANT;

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || loading} className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], className)}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], className)} />;
}

export function Card({
  className,
  children,
  as: Tag = "section",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag {...props} className={cx("rounded-3xl border border-line bg-surface p-6 sm:p-8", className)}>
      {children}
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">{children}</p>;
}

const TONE_STYLE: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-ink",
  progress: "bg-neutral-soft text-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
};
const TONE_ICON: Record<Tone, typeof Check> = {
  neutral: CircleDashed,
  progress: LoaderCircle,
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
};

/** Status is always icon + text; colour alone never carries it. */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium", TONE_STYLE[tone])}>
      <Icon className={cx("size-4 shrink-0", tone === "progress" && "animate-spin")} aria-hidden />
      {children}
    </span>
  );
}

export function Notice({ tone, title, children }: { tone: Exclude<Tone, "progress">; title: string; children?: ReactNode }) {
  const Icon = TONE_ICON[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-2xl p-4", TONE_STYLE[tone])}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 text-[15px]">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-ink/80">{children}</div>}
      </div>
    </div>
  );
}

/** A monospace identifier that wraps safely, with a copy action. */
export function Identifier({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-[13px] text-muted">{label}</dt>
        <dd className="mt-0.5 break-all font-mono text-[13px] text-ink">{value}</dd>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => setCopied(true));
        }}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line hover:bg-neutral-soft"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}

export function Details({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line px-5 py-4 text-[15px] text-ink/85">{children}</div>
    </details>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] font-medium text-ink sm:text-right">{children}</dd>
    </div>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.5 9.2a4.4 4.4 0 1 0 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      CipherComply
    </span>
  );
}
