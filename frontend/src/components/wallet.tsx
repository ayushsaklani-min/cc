// The browser wallet connection, shared by the header, the dashboard and the
// submission step. Every state shown comes from the wallet itself: whether an
// extension is present, and what its connect call returned.
"use client";

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Wallet } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { reasonText } from "@/lib/copy";
import { useService } from "./service";
import { Button } from "./ui";

export type WalletState =
  | { kind: "checking" }
  /** No compatible wallet extension is injected into this page. */
  | { kind: "not_installed" }
  | { kind: "disconnected"; error?: string }
  | { kind: "connecting" }
  | { kind: "connected"; address: string };

interface WalletContextValue {
  state: WalletState;
  /** Connects if needed and returns the live connection. Throws a WalletError on failure. */
  connect(): Promise<ConnectedAPI>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/** A wallet speaking connector API 4.x is injected. Cheap: does not load the proving code. */
function walletInjected(): boolean {
  const injected = (window as { midnight?: Record<string, { apiVersion?: unknown }> }).midnight;
  return !!injected && Object.values(injected).some((w) => typeof w?.apiVersion === "string" && w.apiVersion.startsWith("4."));
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { service } = useService();
  const [state, setState] = useState<WalletState>({ kind: "checking" });
  const api = useRef<ConnectedAPI | null>(null);
  const network = service.kind === "ready" ? service.config.network : null;

  useEffect(() => {
    // Extensions inject shortly after load, so look again once before concluding there is none.
    const detect = () => setState((s) => (s.kind === "checking" || s.kind === "not_installed" ? (walletInjected() ? { kind: "disconnected" } : { kind: "not_installed" }) : s));
    const first = setTimeout(detect, 0);
    const second = setTimeout(detect, 1500);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  const connect = useCallback(async () => {
    if (network === null) throw new Error("service not ready");
    if (api.current) {
      const status = await api.current.getConnectionStatus().catch(() => ({ status: "disconnected" as const }));
      if (status.status === "connected") return api.current;
      api.current = null;
    }
    setState({ kind: "connecting" });
    const { connectWallet, WalletError } = await import("../../../lib/browser-submit");
    try {
      const connected = await connectWallet(network);
      const { unshieldedAddress } = await connected.getUnshieldedAddress();
      api.current = connected;
      setState({ kind: "connected", address: unshieldedAddress });
      return connected;
    } catch (e) {
      const code = e instanceof WalletError ? e.code : "wallet_error";
      setState(code === "no_wallet" ? { kind: "not_installed" } : { kind: "disconnected", error: code });
      throw e;
    }
  }, [network]);

  return <WalletContext.Provider value={{ state, connect }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet outside WalletProvider");
  return ctx;
}

const short = (address: string) => (address.length > 22 ? `${address.slice(0, 14)}…${address.slice(-6)}` : address);

/** One-line description of the wallet state, for cards and rows. */
export function walletStatusText(state: WalletState): string {
  switch (state.kind) {
    case "checking":
      return "Checking…";
    case "not_installed":
      return "No Midnight wallet found";
    case "connecting":
      return "Waiting for the wallet…";
    case "connected":
      return `Connected · ${short(state.address)}`;
    case "disconnected":
      return "Not connected";
  }
}

/** The connect control. `compact` is the header form. */
export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { state, connect } = useWallet();
  const { service } = useService();
  if (service.kind !== "ready") return null;

  if (state.kind === "connected") {
    return (
      <span
        className={`inline-flex items-center gap-2 border border-line-strong bg-surface text-[13px] ${compact ? "px-3 py-1.5" : "px-4 py-2.5"}`}
        title={state.address}
      >
        <Wallet className="size-4 text-success" aria-hidden />
        <span className="font-medium">Wallet connected</span>
        <span className="font-mono text-muted">{short(state.address)}</span>
      </span>
    );
  }
  if (state.kind === "not_installed") {
    return <span className="text-[13px] text-muted">No Midnight wallet found in this browser</span>;
  }
  return (
    <div className={compact ? "" : "space-y-2"}>
      <Button
        variant={compact ? "secondary" : "primary"}
        className={compact ? "min-h-9 px-4 text-[13px]" : ""}
        loading={state.kind === "connecting"}
        disabled={state.kind === "checking"}
        onClick={() => void connect().catch(() => undefined)}
      >
        {state.kind !== "connecting" && <Wallet className="size-4" aria-hidden />}
        {state.kind === "connecting" ? "Approve in your wallet" : "Connect wallet"}
      </Button>
      {!compact && state.kind === "disconnected" && state.error && (
        <p role="alert" className="text-[14px] text-error">
          {reasonText(state.error)}
        </p>
      )}
    </div>
  );
}
