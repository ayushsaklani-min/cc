// What the server says about itself, and whether this browser has a valid
// session. Both come from live API calls; neither has a hard-coded fallback.
"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchConfig, fetchSession, type ConfigResult, type SessionInfo } from "@/lib/api";
import { useSessionToken } from "@/lib/store";

export type ServiceState = { kind: "loading" } | ConfigResult;
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

  useEffect(() => {
    let live = true;
    void fetchConfig().then((r) => live && setService(r));
    return () => {
      live = false;
    };
  }, [generation]);

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
  }, [token, generation]);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);
  return <ServiceContext.Provider value={{ service, session, reload }}>{children}</ServiceContext.Provider>;
}

export function useService() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error("useService outside ServiceProvider");
  return ctx;
}
