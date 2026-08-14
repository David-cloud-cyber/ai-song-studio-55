import { createFileRoute } from "@tanstack/react-router";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingSection } from "@/components/marketing/PricingSection";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Tarifs — Loopster" },
      {
        name: "description",
        content: "Choisis la formule Loopster adaptée à ton rythme de création.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main className="pt-[60px] sm:pt-[68px]">
        <PricingSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
