import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { plans, creditPacks } from "@/data/mock";
import type { CreditPack } from "@/data/mock";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { soon } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({
    meta: [
      { title: "Crédits · BeatStudio AI" },
      { name: "description", content: "Boutique de crédits, forfaits et historique d'usage." },
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
  const { user } = useSession();
  const { data: profile } = useProfile();
  const credits = profile?.credits ?? 0;
  const max = 1000;
  const pct = Math.min(100, Math.round((credits / max) * 100));
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);

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

  const confirm = () => {
    setSelectedPack(null);
    soon("Paiement bientôt disponible (phase 2)");
  };

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <SectionHeader eyebrow="Balance" title="Crédits studio" />
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
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            <span>Solde en direct</span>
            <span>Mis à jour {profile ? "à l'instant" : "…"}</span>
          </div>
        </div>
      </section>

      <section className="px-5 pt-8">
        <SectionHeader
          eyebrow="Boutique"
          title="Packs de crédits"
          action={
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Paiement à l'usage
            </span>
          }
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {creditPacks.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPack(p)}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                p.highlight
                  ? "border-neon/40 bg-neon/5 ring-1 ring-neon/20 hover:bg-neon/10"
                  : "border-white/5 bg-surface hover:bg-surface-2",
              )}
            >
              {p.highlight && (
                <span className="absolute right-2 top-2 rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-neon">
                  Populaire
                </span>
              )}
              <Zap
                className={cn("size-5", p.highlight ? "text-neon" : "text-zinc-400")}
                strokeWidth={2}
              />
              <div className="mt-3 text-2xl font-semibold tabular-nums">
                {p.credits}
                <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  CR
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neon">
                {p.price}
              </div>
              {p.bonus && (
                <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-emerald-400">
                  {p.bonus}
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pt-8">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
          Formules
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl border p-5",
                p.highlight
                  ? "border-neon/40 bg-neon/5 ring-1 ring-neon/20"
                  : "border-white/5 bg-surface",
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{p.name}</h4>
                    {p.current && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-300">
                        Actuel
                      </span>
                    )}
                    {p.highlight && (
                      <span className="rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-neon">
                        Populaire
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold">{p.price}</span>
                    <span className="text-xs text-zinc-400">{p.period}</span>
                  </div>
                </div>
                {p.highlight && <Sparkles className="size-5 text-neon" />}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-neon" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => soon("Abonnements bientôt disponibles (phase 2)")}
                disabled={p.current}
                className={cn(
                  "mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  p.current
                    ? "bg-white/5 text-zinc-500"
                    : p.highlight
                      ? "bg-neon text-background"
                      : "border border-white/10 bg-surface-2 text-foreground",
                )}
              >
                {p.current ? "Formule actuelle" : "Bientôt disponible"}
              </button>
            </div>
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
              <li key={tx.id} className="flex items-center justify-between p-4">
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

      <Dialog open={!!selectedPack} onOpenChange={(o) => !o && setSelectedPack(null)}>
        <DialogContent className="border-white/10 bg-surface text-foreground sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-2">
              <Zap className="size-5 text-neon" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-neon">
                Confirmer l'achat
              </span>
            </div>
            <DialogTitle className="text-2xl">
              {selectedPack?.credits} crédits pour {selectedPack?.price}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedPack?.bonus ?? "Débité immédiatement, disponibles sans limite."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border border-white/5 bg-background/40 p-4">
            <Row label="Pack" value={`${selectedPack?.credits} CR`} />
            <Row label="Bonus" value={selectedPack?.bonus ?? "—"} />
            <Row label="Total" value={selectedPack?.price ?? ""} bold />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setSelectedPack(null)}
              className="flex-1 rounded-xl border border-white/10 bg-surface-2 py-2.5 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={confirm}
              className="flex-1 rounded-xl bg-neon py-2.5 text-sm font-semibold text-background"
            >
              Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={cn(bold ? "font-semibold text-neon" : "text-foreground")}>{value}</span>
    </div>
  );
}
