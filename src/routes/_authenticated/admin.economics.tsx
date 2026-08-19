import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { BarChart3, Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { addAdSpendEntry, getEconomicsReport } from "@/lib/economics.functions";

export const Route = createFileRoute("/_authenticated/admin/economics")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Rentabilité · Loopster" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EconomicsPage,
});

function EconomicsPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthStart = useMemo(() => `${today.slice(0, 8)}01`, [today]);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [campaign, setCampaign] = useState("");
  const [spend, setSpend] = useState("");
  const [spendBusy, setSpendBusy] = useState(false);
  const getReport = useServerFn(getEconomicsReport);
  const addSpend = useServerFn(addAdSpendEntry);
  const queryClient = useQueryClient();
  const report = useQuery({
    queryKey: ["economics-report", from, to],
    queryFn: () => getReport({ data: { from, to } }),
  });

  const addCampaignSpend = async () => {
    const amountXaf = Number(spend);
    if (!campaign.trim() || !Number.isInteger(amountXaf) || amountXaf < 0) return;
    setSpendBusy(true);
    try {
      await addSpend({
        data: { periodStart: from, periodEnd: to, campaign, amountXaf },
      });
      setCampaign("");
      setSpend("");
      await queryClient.invalidateQueries({ queryKey: ["economics-report"] });
      toast.success("Dépense publicitaire ajoutée");
    } catch (error) {
      toast.error("Impossible d’ajouter cette dépense", {
        description: error instanceof Error ? error.message : "Accès réservé à l’administration.",
      });
    } finally {
      setSpendBusy(false);
    }
  };

  return (
    <PageTransition>
      <section className="px-5 pt-8">
        <SectionHeader
          eyebrow="Administration"
          title="Rentabilité Loopster"
          action={<ShieldCheck className="size-5 text-primary" aria-hidden />}
        />
        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Du
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Au
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <span className="text-xs text-muted-foreground">Données réservées à ton équipe.</span>
        </div>
      </section>

      {report.isPending ? (
        <div className="px-5 pt-8 text-sm text-muted-foreground">Calcul en cours…</div>
      ) : report.isError ? (
        <div className="mx-5 mt-8 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {report.error instanceof Error ? report.error.message : "Rapport indisponible."}
        </div>
      ) : report.data ? (
        <>
          <section className="grid gap-3 px-5 pt-8 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Revenu net"
              value={`${report.data.netRevenueXaf.toLocaleString("fr-FR")} XAF`}
            />
            <Metric
              label="Marge estimée"
              value={`${report.data.estimatedMarginXaf.toLocaleString("fr-FR")} XAF`}
            />
            <Metric label="Utilisateurs payants" value={String(report.data.paidUsers)} />
            <Metric
              label="Coût acquisition / payant"
              value={`${report.data.acquisitionCostPerPaidUserXaf.toLocaleString("fr-FR")} XAF`}
            />
          </section>

          <section className="grid gap-3 px-5 pt-4 md:grid-cols-2">
            <DetailCard
              label="Paiements bruts"
              value={`${report.data.grossRevenueXaf.toLocaleString("fr-FR")} XAF`}
            />
            <DetailCard
              label="Frais Fapshi"
              value={`${report.data.fapshiFeesXaf.toLocaleString("fr-FR")} XAF`}
            />
            <DetailCard
              label="Coût fournisseur"
              value={`${report.data.providerCostUsd.toFixed(2)} $ · ${report.data.providerCostXaf.toLocaleString("fr-FR")} XAF`}
            />
            <DetailCard
              label="Crédits remboursés"
              value={report.data.creditsRefunded.toLocaleString("fr-FR")}
            />
          </section>

          <section className="px-5 pt-8">
            <SectionHeader
              eyebrow="Campagnes"
              title="Dépenses publicitaires"
              action={<BarChart3 className="size-5 text-primary" aria-hidden />}
            />
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
                Campagne
                <input
                  value={campaign}
                  onChange={(event) => setCampaign(event.target.value)}
                  placeholder="Ex. lancement artistes"
                  className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Montant XAF
                <input
                  inputMode="numeric"
                  value={spend}
                  onChange={(event) => setSpend(event.target.value)}
                  placeholder="0"
                  className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                disabled={spendBusy}
                onClick={() => void addCampaignSpend()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {spendBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Ajouter
              </button>
            </div>
          </section>
        </>
      ) : null}
    </PageTransition>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-medium">{value}</div>
    </div>
  );
}
