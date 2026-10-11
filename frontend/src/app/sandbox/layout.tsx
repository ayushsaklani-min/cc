import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sandbox — CipherComply",
  description: "Run the compiled CipherComply contract in your browser and try to break it. No wallet needed.",
};

// Everything on this page happens in the browser after load.
export const instant = false;

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
