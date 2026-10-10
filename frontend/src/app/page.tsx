import { Hero } from "@/components/landing-hero";
import { Boundary, Closing, Facts, Process, Protocols, Questions, ScrollMarquee } from "@/components/landing-sections";
import { MarketingNav } from "@/components/marketing-nav";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main>
        <Hero />
        <ScrollMarquee />
        <Process />
        <Boundary />
        <Facts />
        <Protocols />
        <Questions />
        <Closing />
      </main>
    </div>
  );
}
