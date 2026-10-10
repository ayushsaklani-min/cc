import { AppShell } from "@/components/app-shell";
import { ServiceProvider } from "@/components/service";
import { WalletProvider } from "@/components/wallet";

// Everything in the workspace renders from browser-held state behind a client-side
// gate, so there is nothing for instant-navigation validation to check here.
export const instant = false;

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServiceProvider>
      <WalletProvider>
        <AppShell>{children}</AppShell>
      </WalletProvider>
    </ServiceProvider>
  );
}
