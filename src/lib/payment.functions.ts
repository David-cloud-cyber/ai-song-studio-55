import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPriceXaf, getPricingPlan, isPaidPricingPlan } from "@/lib/pricing";

const paymentInput = z.object({
  plan: z.enum(["pro", "premier"]),
  cycle: z.enum(["monthly", "yearly"]),
});

type PaymentResponse = { link: string; transId: string };

/** Creates a hosted checkout link without ever exposing provider credentials to the browser. */
export const createFapshiCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentInput.parse(input))
  .handler(async ({ data, context }): Promise<PaymentResponse> => {
    const { supabase, userId } = context;
    const plan = getPricingPlan(data.plan);
    if (!isPaidPricingPlan(plan.id)) throw new Error("Cette formule ne nécessite pas de paiement.");

    const apiKey = process.env.FAPSHI_API_KEY;
    const apiUser = process.env.FAPSHI_API_USER;
    const baseUrl = process.env.FAPSHI_API_URL ?? "https://api.fapshi.com";
    if (!apiKey || !apiUser || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Le paiement n'est pas encore activé sur Loopster.");
    }

    const { data: account, error: accountError } = await supabase.auth.getUser();
    if (accountError) throw accountError;
    const email = account.user?.email;
    const request = getRequest();
    const origin = new URL(request.url).origin;
    const amountXaf = getPriceXaf(plan, data.cycle);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan: data.plan,
        cycle: data.cycle,
        amount_xaf: amountXaf,
        credits_granted: plan.credits,
        provider: "fapshi",
        status: "pending",
      })
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("Commande impossible à préparer.");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/initiate-pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        apiuser: apiUser,
      },
      body: JSON.stringify({
        amount: amountXaf,
        email,
        redirectUrl: `${origin}/credits?plan=${data.plan}&cycle=${data.cycle}&payment=return`,
        userId,
        externalId: order.id,
        message: `Loopster ${plan.name} · ${data.cycle === "yearly" ? "12 mois" : "30 jours"}`,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      link?: string;
      transId?: string;
      message?: string;
    };
    if (!response.ok || !body.link || !body.transId) {
      await supabaseAdmin
        .from("payment_orders")
        .update({ status: "failed", provider_status: "FAILED" })
        .eq("id", order.id);
      throw new Error(body.message ?? "Le paiement n'a pas pu être préparé.");
    }

    await supabaseAdmin
      .from("payment_orders")
      .update({ provider_reference: body.transId, provider_status: "CREATED" })
      .eq("id", order.id);

    return { link: body.link, transId: body.transId };
  });
