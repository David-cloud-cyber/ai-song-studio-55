import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import {
  PRICING_PLANS,
  cycleLabel,
  formatXaf,
  getPriceXaf,
  type BillingCycle,
} from "@/lib/pricing";
import { trackEvent } from "@/lib/analytics";
import { createFapshiCheckout } from "@/lib/payment.functions";

export function PricingSection({ compact = false }: { compact?: boolean }) {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  useEffect(() => {
    trackEvent("pricing_view", { cycle });
  }, [cycle]);

  return (
    <section
      id="pricing"
      className={cn(
        "border-y border-border-subtle bg-surface-subtle/50 px-4 sm:px-5",
        compact ? "py-16" : "py-24 md:py-32",
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
            Des formules simples
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Crée librement. Passe à la vitesse supérieure quand tu en as besoin.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Écoute gratuitement dans ta bibliothèque. Les offres payantes ajoutent les exports, les
            droits commerciaux et plus de liberté de création.
          </p>

          <div
            className="mt-7 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1"
            role="tablist"
            aria-label="Période de facturation"
          >
            {(["monthly", "yearly"] as BillingCycle[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={cycle === item}
                onClick={() => setCycle(item)}
                className={cn(
                  "min-h-10 rounded-full px-4 py-2 text-sm font-medium",
                  cycle === item
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item === "monthly" ? "Mensuel" : "Annuel · 2 mois offerts"}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Renouvellement manuel · prix affiché en XAF · aucun coût caché
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} cycle={cycle} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-muted-foreground">
          Les crédits servent aux créations et aux outils comme les paroles, les fichiers WAV, les
          vidéos et les séparations de pistes. Les outils avancés utilisent davantage de crédits.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  cycle,
}: {
  plan: (typeof PRICING_PLANS)[number];
  cycle: BillingCycle;
}) {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const startCheckout = useServerFn(createFapshiCheckout);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const price = getPriceXaf(plan, cycle);
  const featured = plan.id === "pro";

  const startPayment = async () => {
    if (plan.id === "free" || sessionLoading || paymentBusy) return;
    trackEvent("pricing_plan_selected", { plan: plan.id, cycle, amount_xaf: price });
    trackEvent("upgrade_started", { plan: plan.id, cycle });
    const requestId = crypto.randomUUID();
    if (!user) {
      navigate({
        to: "/auth",
        search: { plan: plan.id, cycle, autopay: "1", paymentRequestId: requestId },
      });
      return;
    }

    setPaymentBusy(true);
    trackEvent("payment_started", { plan: plan.id, cycle });
    try {
      const result = await startCheckout({
        data: { plan: plan.id, cycle, requestId },
      });
      window.location.assign(result.link);
    } catch (error) {
      setPaymentBusy(false);
      trackEvent("payment_failed", { plan: plan.id, cycle });
      toast.error("Le paiement fait une petite pause", {
        description: error instanceof Error ? error.message : "Tu peux réessayer dans un instant.",
      });
    }
  };

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border p-6 sm:p-7",
        featured ? "border-primary/60 bg-primary/[0.06]" : "border-border bg-surface",
      )}
    >
      {plan.badge && (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
          {featured && <Heart className="size-3 fill-current" />}
          {plan.badge}
        </span>
      )}
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
        Loopster {plan.name}
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">{plan.audience}</h3>
      <div className="mt-6 flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {price === 0 ? "Gratuit" : formatXaf(price)}
        </span>
        {price > 0 && <span className="text-sm text-muted-foreground">/ {cycleLabel(cycle)}</span>}
      </div>
      <p className="mt-2 text-sm font-medium text-primary">{plan.creationsLabel}</p>
      {cycle === "yearly" && plan.yearlySavings && (
        <p className="mt-1 text-xs text-muted-foreground">{plan.yearlySavings}</p>
      )}

      {plan.id === "free" ? (
        <Link
          to="/auth"
          search={{ plan: plan.id, cycle }}
          onClick={() =>
            trackEvent("pricing_plan_selected", { plan: plan.id, cycle, amount_xaf: price })
          }
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface-subtle px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-elevated"
        >
          Commencer gratuitement
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void startPayment()}
          disabled={sessionLoading || paymentBusy}
          className={cn(
            "mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60",
            "bg-primary text-primary-foreground",
          )}
        >
          {paymentBusy ? "Ouverture de Fapshi…" : "Payer avec Fapshi"}
        </button>
      )}

      <ul className="mt-7 space-y-3 text-sm">
        {plan.features
          .filter((feature) => feature.included)
          .map((feature) => (
            <li key={feature.label} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span className="leading-5 text-foreground">{feature.label}</span>
            </li>
          ))}
      </ul>

      <details className="mt-6 border-t border-border-subtle pt-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Voir toutes les fonctions
        </summary>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {plan.details
            .filter((feature) => feature.included)
            .map((feature) => (
              <li key={feature.label} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{feature.label}</span>
              </li>
            ))}
        </ul>
      </details>
    </article>
  );
}
