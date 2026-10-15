// What the server says about itself, and whether this browser has a valid
// session. Both come from live API calls; neither has a hard-coded fallback.
"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchConfig, fetchSession, type ConfigResult, type SessionInfo } from "@/lib/api";
import { setSelectedPolicy, useSelectedPolicy, useSessionToken } from "@/lib/store";

export type ServiceState =
  | { kind: "loading" }
  /** The server did not answer yet; it may be waking from sleep. Still retrying. */
  | { kind: "starting" }
  | Exclude<ConfigResult, { kind: "unknown_policy" }>;

/** How long to keep retrying a server that does not answer, and how often. */
const WAKE_TIMEOUT_MS = 120_000;
const WAKE_RETRY_MS = 4_000;
export type SessionState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "invalid" }
  | { kind: "unavailable" }
  | { kind: "signed_in"; token: string; info: SessionInfo };

const ServiceContext = createContext<{ service: ServiceState; session: SessionState; reload(): void } | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [service, setService] = useState<ServiceState>({ kind: "loading" });
  const [session, setSession] = useState<SessionState>({ kind: "loading" });
  const [generation, setGeneration] = useState(0);
  const token = useSessionToken();
  const policy = useSelectedPolicy();
  const ready = service.kind === "ready";

  useEffect(() => {
    let live = true;
    const started = Date.now();
    // The hosted backend sleeps when idle and takes up to a minute to wake, so an
    // unanswered request is retried for a while before the page reports a failure.
    const attempt = async () => {
      const r = await fetchConfig();
      if (!live) return;
      if (r.kind === "unreachable" && Date.now() - started < WAKE_TIMEOUT_MS) {
        setService({ kind: "starting" });
        setTimeout(() => void attempt(), WAKE_RETRY_MS);
        return;
      }
      // A policy remembered from another deployment: drop it and load the default.
      if (r.kind === "unknown_policy") setSelectedPolicy(null);
      else setService(r);
    };
    void attempt();
    return () => {
      live = false;
    };
  }, [generation, policy]);

  useEffect(() => {
    let live = true;
    if (token === null) {
      // Resolved after hydration, so the first paint never flashes a signed-out state.
      queueMicrotask(() => live && setSession({ kind: "signed_out" }));
    } else {
      void fetchSession(token).then((r) => {
        if (!live) return;
        setSession(typeof r === "string" ? { kind: r } : { kind: "signed_in", token, info: r });
      });
    }
    return () => {
      live = false;
    };
  // Asked again once the service is up, in case the first try met a sleeping server.
  }, [token, generation, ready]);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);
  return <ServiceContext.Provider value={{ service, session, reload }}>{children}</ServiceContext.Provider>;
}

export function useService() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error("useService outside ServiceProvider");
  return ctx;
}
