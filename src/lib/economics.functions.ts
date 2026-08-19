import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function adminClient(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Accès réservé à l’administration.");
  return supabaseAdmin;
}

export const getEconomicsReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ from: dateInput, to: dateInput }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminClient(context.userId);
    const [ordersResult, jobsResult, spendResult, profilesResult] = await Promise.all([
      supabaseAdmin
        .from("payment_orders")
        .select("user_id,plan,cycle,amount_xaf,revenue_xaf,fee_xaf,status,created_at")
        .gte("created_at", `${data.from}T00:00:00.000Z`)
        .lte("created_at", `${data.to}T23:59:59.999Z`),
      supabaseAdmin
        .from("generation_jobs")
        .select("user_id,provider_cost_usd,credits_spent,credits_refunded,status,created_at")
        .gte("created_at", `${data.from}T00:00:00.000Z`)
        .lte("created_at", `${data.to}T23:59:59.999Z`),
      supabaseAdmin
        .from("ad_spend_entries")
        .select("amount_xaf")
        .gte("period_start", data.from)
        .lte("period_end", data.to),
      supabaseAdmin.from("profiles").select("id").in("plan", ["pro", "premier"]),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (jobsResult.error) throw jobsResult.error;
    if (spendResult.error) throw spendResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const orders = ordersResult.data ?? [];
    const jobs = jobsResult.data ?? [];
    const paidOrders = orders.filter((order) => order.status === "paid");
    const grossRevenueXaf = paidOrders.reduce((sum, order) => sum + order.amount_xaf, 0);
    const netRevenueXaf = paidOrders.reduce(
      (sum, order) => sum + (order.revenue_xaf ?? order.amount_xaf),
      0,
    );
    const fapshiFeesXaf = paidOrders.reduce((sum, order) => {
      const fee =
        order.fee_xaf ?? Math.max(0, order.amount_xaf - (order.revenue_xaf ?? order.amount_xaf));
      return sum + fee;
    }, 0);
    const providerCostUsd = jobs.reduce((sum, job) => sum + Number(job.provider_cost_usd ?? 0), 0);
    const providerCredits = jobs.reduce((sum, job) => sum + Number(job.credits_spent ?? 0), 0);
    const creditsRefunded = jobs.reduce((sum, job) => sum + Number(job.credits_refunded ?? 0), 0);
    const adSpendXaf = (spendResult.data ?? []).reduce((sum, entry) => sum + entry.amount_xaf, 0);
    const usdXafRate = Number(process.env.USD_XAF_RATE ?? 600);
    const providerCostXaf = Math.round(providerCostUsd * usdXafRate);
    const paidUsers = new Set(paidOrders.map((order) => order.user_id)).size;
    const totalCostXaf = fapshiFeesXaf + providerCostXaf + adSpendXaf;

    return {
      period: { from: data.from, to: data.to },
      grossRevenueXaf,
      netRevenueXaf,
      fapshiFeesXaf,
      providerCostUsd: Number(providerCostUsd.toFixed(4)),
      providerCostXaf,
      providerCredits,
      creditsRefunded,
      adSpendXaf,
      totalCostXaf,
      estimatedMarginXaf: netRevenueXaf - totalCostXaf,
      paidUsers,
      activePaidUsers: profilesResult.data?.length ?? 0,
      averageRevenuePerPaidUserXaf: paidUsers ? Math.round(netRevenueXaf / paidUsers) : 0,
      acquisitionCostPerPaidUserXaf: paidUsers ? Math.round(adSpendXaf / paidUsers) : 0,
      ordersByPlan: ["pro", "premier"].map((plan) => ({
        plan,
        count: paidOrders.filter((order) => order.plan === plan).length,
        revenueXaf: paidOrders
          .filter((order) => order.plan === plan)
          .reduce((sum, order) => sum + (order.revenue_xaf ?? order.amount_xaf), 0),
      })),
    };
  });

export const addAdSpendEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        periodStart: dateInput,
        periodEnd: dateInput,
        campaign: z.string().trim().min(1).max(160),
        amountXaf: z.number().int().min(0).max(100_000_000),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminClient(context.userId);
    const { data: entry, error } = await supabaseAdmin
      .from("ad_spend_entries")
      .insert({
        period_start: data.periodStart,
        period_end: data.periodEnd,
        campaign: data.campaign,
        amount_xaf: data.amountXaf,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id,period_start,period_end,campaign,amount_xaf,source,notes,created_at")
      .single();
    if (error) throw error;
    return entry;
  });
