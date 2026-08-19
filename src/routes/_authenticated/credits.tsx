import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { FREE_DAILY_CREDITS, isPaidPlan } from "@/lib/plans";
import {
  PRICING_PLANS,
  cycleLabel,
  formatXaf,
  getPriceXaf,
  getPricingPlan,
  type BillingCycle,
  type PricingPlanId,
} from "@/lib/pricing";
import { createFapshiCheckout } from "@/lib/payment.functions";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const searchSchema = z.object({
  plan: z.enum(["pro", "premier"]).optional(),
  cycle: z.enum(["monthly", "yearly"]).optional(),
  payment: z.enum(["return"]).optional(),
  orderId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/credits")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Formules · Loopster" },
      { name: "description", content: "Choisis la formule Loopster adaptée à ton rythme." },
    ],
  }),
  component: CreditsPage,
});

type Tx = {
  id: string;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
};

function CreditsPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const startCheckout = useServerFn(createFapshiCheckout);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentStage, setPaymentStage] = useState<"idle" | "preparing" | "redirecting">("idle");
  const credits = profile?.credits ?? 0;
  const currentPlan = String(profile?.plan ?? "free").toLowerCase();
  const currentOffer = getPricingPlan(currentPlan);
  const max = isPaidPlan(profile) ? currentOffer.credits : FREE_DAILY_CREDITS;
  const pct = Math.min(100, Math.round((credits / max) * 100));
  const selectedPlan = search.plan ? getPricingPlan(search.plan) : null;
  const selectedCycle: BillingCycle = search.cycle ?? "monthly";
  const [paymentPolling, setPaymentPolling] = useState(search.payment === "return");

  useEffect(() => {
    if (selectedPlan) {
      trackEvent("checkout_viewed", { plan: selectedPlan.id, cycle: selectedCycle });
    }
  }, [selectedPlan, selectedCycle]);

  useEffect(() => {
    setPaymentPolling(search.payment === "return");
    if (search.payment !== "return") return;
    const timeout = window.setTimeout(() => setPaymentPolling(false), 30_000);
    return () => window.clearTimeout(timeout);
  }, [search.payment]);

  const { data: paymentOrder } = useQuery({
    queryKey: ["payment-order", user?.id, search.orderId],
    enabled: Boolean(user && search.payment === "return"),
    queryFn: async () => {
      let query = supabase
        .from("payment_orders")
        .select("id,plan,cycle,amount_xaf,status,provider_status,expires_at,created_at")
        .eq("user_id", user!.id);
      if (search.orderId) query = query.eq("id", search.orderId);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return paymentPolling && status !== "paid" && status !== "failed" ? 3000 : false;
    },
  });

  const paymentExpired = paymentOrder?.provider_status === "EXPIRED";

  useEffect(() => {
    if (paymentOrder?.status === "paid") {
      setPaymentPolling(false);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      trackEvent("payment_success", { plan: paymentOrder.plan, cycle: paymentOrder.cycle });
    }
    if (paymentOrder?.status === "failed") {
      setPaymentPolling(false);
      trackEvent("payment_failed", { plan: paymentOrder.plan, cycle: paymentOrder.cycle });
    }
  }, [paymentOrder, queryClient]);

  const { data: transactions = [] } = useQuery({
    queryKey: ["credit-transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id,amount,reason,balance_after,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Tx[];
    },
  });

  const pay = async () => {
    if (!selectedPlan || (selectedPlan.id !== "pro" && selectedPlan.id !== "premier")) return;
    setPaymentBusy(true);
    setPaymentStage("preparing");
    trackEvent("payment_started", { plan: selectedPlan.id, cycle: selectedCycle });
    try {
      const result = await startCheckout({
        data: {
          plan: selectedPlan.id,
          cycle: selectedCycle,
          requestId: crypto.randomUUID(),
        },
      });
      setPaymentStage("redirecting");
      window.location.assign(result.link);
    } catch (error) {
      setPaymentBusy(false);
      setPaymentStage("idle");
      trackEvent("payment_failed", { plan: selectedPlan.id, cycle: selectedCycle });
      toast.error("Le paiement fait une petite pause", {
        description: error instanceof Error ? error.message : "Tu peux réessayer dans un instant.",
      });
    }
  };

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Ton espace" title="Crédits et formules" />
        <div className="rounded-3xl border border-neon/20 bg-gradient-to-br from-neon/10 via-surface to-surface p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight">{credits}</span>
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
              / {max} CR
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon to-cyan-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            <span>
              {currentOffer.name} · {currentOffer.creationsLabel}
            </span>
            <span>Mis à jour à l'instant</span>
          </div>
        </div>
      </section>

      {selectedPlan && (
        <section className="px-5 pt-8">
          <div className="rounded-3xl border border-neon/30 bg-neon/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-neon">
                  <Sparkles className="size-3" /> Ton choix
                </div>
                <h2 className="mt-2 text-2xl font-semibold">Loopster {selectedPlan.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{selectedPlan.audience}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">
                  {formatXaf(getPriceXaf(selectedPlan, selectedCycle))}
                </div>
                <div className="text-xs text-zinc-500">pour {cycleLabel(selectedCycle)}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
              <SummaryRow
                label="Crédits inclus"
                value={selectedPlan.credits.toLocaleString("fr-FR")}
              />
              <SummaryRow label="Résultat attendu" value={selectedPlan.creationsLabel} />
              <SummaryRow label="Droits commerciaux" value="Inclus" />
              <SummaryRow label="Renouvellement" value="Manuel" />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate({ to: "/credits", search: {} })}
                className="min-h-11 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon"
              >
                Changer de formule
              </button>
              <button
                type="button"
                onClick={pay}
                disabled={paymentBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon disabled:opacity-60"
              >
                {paymentBusy && <Loader2 className="size-4 animate-spin" />}
                {paymentStage === "preparing"
                  ? "Préparation du paiement…"
                  : paymentStage === "redirecting"
                    ? "Ouverture de Fapshi…"
                    : "Payer avec Fapshi"}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500 sm:text-right">
              Prix affiché en XAF avant le paiement. Aucun coût caché.
            </p>
          </div>
        </section>
      )}

      {search.payment === "return" && (
        <section className="px-5 pt-6">
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              paymentOrder?.status === "paid"
                ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-100"
                : paymentExpired
                  ? "border-amber-300/20 bg-amber-300/5 text-amber-100"
                  : paymentOrder?.status === "failed"
                    ? "border-rose-300/20 bg-rose-300/5 text-rose-100"
                    : "border-amber-300/20 bg-amber-300/5 text-amber-100",
            )}
          >
            {paymentOrder?.status === "paid"
              ? "Paiement confirmé ! Ta formule et tes crédits sont maintenant actifs."
              : paymentExpired
                ? "Le lien de paiement a expiré. Tu peux en générer un nouveau."
                : paymentOrder?.status === "failed"
                  ? "Le paiement n'a pas été confirmé. Tu peux choisir une nouvelle fois ta formule."
                  : "Ton paiement est en cours de vérification. La formule sera activée dès sa confirmation."}
          </div>
        </section>
      )}

      <section className="px-5 pt-8">
        <SectionHeader
          eyebrow="Formules"
          title="Crée à ton rythme"
          action={
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Sans coût caché
            </span>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={currentPlan === plan.id}
              onChoose={(id: PricingPlanId) => {
                if (id === "free") {
                  navigate({ to: "/credits", search: {} });
                  return;
                }
                navigate({ to: "/credits", search: { plan: id, cycle: selectedCycle } });
              }}
            />
          ))}
        </div>
      </section>

      <section className="px-5 pt-8">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Historique
        </h3>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
            Aucun mouvement pour l'instant.
          </div>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5 bg-surface">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{tx.reason}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {new Date(tx.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-mono text-sm",
                    tx.amount >= 0 ? "text-emerald-400" : "text-neon",
                  )}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageTransition>
  );
}

function PlanCard({
  plan,
  current,
  onChoose,
}: {
  plan: (typeof PRICING_PLANS)[number];
  current: boolean;
  onChoose: (plan: PricingPlanId) => void;
}) {
  const price = getPriceXaf(plan, "monthly");
  return (
    <article
      className={cn(
        "rounded-2xl border p-5",
        plan.id === "pro"
          ? "border-neon/40 bg-neon/5 ring-1 ring-neon/20"
          : "border-white/5 bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">{plan.audience}</p>
        </div>
        {plan.badge && (
          <span className="rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-neon">
            {plan.badge}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{price === 0 ? "Gratuit" : formatXaf(price)}</span>
        {price > 0 && <span className="text-xs text-zinc-400">/30 jours</span>}
      </div>
      <div className="mt-1 text-sm font-medium text-neon">{plan.creationsLabel}</div>
      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        {plan.features
          .filter((feature) => feature.included)
          .slice(0, 5)
          .map((feature) => (
            <li key={feature.label} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-neon" />
              <span>{feature.label}</span>
            </li>
          ))}
      </ul>
      <button
        type="button"
        onClick={() => onChoose(plan.id)}
        disabled={current}
        className={cn(
          "mt-5 min-h-11 w-full rounded-xl py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon",
          current
            ? "bg-white/5 text-zinc-500"
            : plan.id === "pro"
              ? "bg-neon text-background"
              : "border border-white/10 bg-surface-2 text-foreground",
        )}
      >
        {current
          ? "Formule actuelle"
          : plan.id === "free"
            ? "Garder Gratuit"
            : `Choisir ${plan.name}`}
      </button>
    </article>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-background/20 px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-200">{value}</span>
    </div>
  );
}
