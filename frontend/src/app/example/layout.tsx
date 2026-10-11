import type { Metadata } from "next";
import { ServiceProvider } from "@/components/service";

export const metadata: Metadata = {
  title: "Example relying app — CipherComply",
  description: "A sample application that admits only visitors with a valid CipherComply verification.",
};

// Renders from browser-held state, so there is nothing for instant-navigation validation to check.
export const instant = false;

export default function ExampleLayout({ children }: { children: React.ReactNode }) {
  return <ServiceProvider>{children}</ServiceProvider>;
}
