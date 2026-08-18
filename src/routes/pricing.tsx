import { createFileRoute } from "@tanstack/react-router";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingSection } from "@/components/marketing/PricingSection";
import { publicSeo, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () => seoHead({ ...publicSeo.pricing, path: "/pricing" }),
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
