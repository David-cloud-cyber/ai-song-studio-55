import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPriceXaf, getPricingPlan, isPaidPricingPlan } from "@/lib/pricing";
import type { Json } from "@/integrations/supabase/types";

const paymentInput = z.object({
  plan: z.enum(["pro", "premier"]),
  cycle: z.enum(["monthly", "yearly"]),
  requestId: z.string().uuid(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
  utmContent: z.string().trim().max(160).optional(),
  utmTerm: z.string().trim().max(160).optional(),
  fbclid: z.string().trim().max(240).optional(),
});

type PaymentResponse = { link: string; transId: string; orderId: string };

const PAYMENT_LINK_TTL_MS = 24 * 60 * 60 * 1000;

function isFapshiLink(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "fapshi.com" || url.hostname.endsWith(".fapshi.com"))
    );
  } catch {
    return false;
  }
}

function getFapshiBaseUrl() {
  const raw = (process.env.FAPSHI_API_URL ?? "https://live.fapshi.com")
    .replace(/^\uFEFF/, "")
    .trim();
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      !new Set(["live.fapshi.com", "sandbox.fapshi.com"]).has(url.hostname)
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new Error("Le service de paiement est momentanément indisponible.");
  }
}

function cleanSecret(value: string | undefined) {
  return value?.replace(/^\uFEFF/, "").trim();
}

/** Creates a hosted checkout link without ever exposing provider credentials to the browser. */
export const createFapshiCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentInput.parse(input))
  .handler(async ({ data, context }): Promise<PaymentResponse> => {
    const { supabase, userId } = context;
    const plan = getPricingPlan(data.plan);
    if (!isPaidPricingPlan(plan.id)) throw new Error("Cette formule ne nécessite pas de paiement.");

    const apiKey = cleanSecret(process.env.FAPSHI_API_KEY);
    const apiUser = cleanSecret(process.env.FAPSHI_API_USER);
    const baseUrl = getFapshiBaseUrl();
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

    let { data: order, error: orderError } = await supabaseAdmin
      .from("payment_orders")
      .select(
        "id,plan,cycle,amount_xaf,credits_granted,status,provider_reference,provider_link,provider_link_expires_at,external_id",
      )
      .eq("user_id", userId)
      .eq("idempotency_key", data.requestId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (order && (order.plan !== data.plan || order.cycle !== data.cycle)) {
      throw new Error("Cette demande de paiement ne correspond plus à la formule choisie.");
    }
    if (order && (order.amount_xaf !== amountXaf || order.credits_granted !== plan.credits)) {
      throw new Error(
        "Le montant de cette demande n'est plus valide. Recommence depuis les tarifs.",
      );
    }

    const linkExpiresAt = order?.provider_link_expires_at
      ? Date.parse(order.provider_link_expires_at)
      : 0;
    if (
      order?.status === "pending" &&
      order.provider_link &&
      order.provider_reference &&
      linkExpiresAt > Date.now() &&
      isFapshiLink(order.provider_link)
    ) {
      return { link: order.provider_link, transId: order.provider_reference, orderId: order.id };
    }
    if (order?.status === "paid") {
      throw new Error("Ce paiement est déjà confirmé.");
    }

    if (!order) {
      const newOrderId = crypto.randomUUID();
      const inserted = await supabaseAdmin
        .from("payment_orders")
        .insert({
          id: newOrderId,
          user_id: userId,
          plan: data.plan,
          cycle: data.cycle,
          amount_xaf: amountXaf,
          credits_granted: plan.credits,
          provider: "fapshi",
          idempotency_key: data.requestId,
          external_id: newOrderId,
          status: "pending",
        })
        .select(
          "id,plan,cycle,amount_xaf,credits_granted,status,provider_reference,provider_link,provider_link_expires_at,external_id",
        )
        .single();
      if (inserted.error?.code === "23505") {
        const existing = await supabaseAdmin
          .from("payment_orders")
          .select(
            "id,plan,cycle,amount_xaf,credits_granted,status,provider_reference,provider_link,provider_link_expires_at,external_id",
          )
          .eq("user_id", userId)
          .eq("idempotency_key", data.requestId)
          .single();
        order = existing.data;
        orderError = existing.error;
      } else {
        order = inserted.data;
        orderError = inserted.error;
      }
      if (orderError || !order) throw orderError ?? new Error("Commande impossible à préparer.");
    }

    if (order.status === "paid") throw new Error("Ce paiement est déjà confirmé.");

    const { error: resetError } = await supabaseAdmin
      .from("payment_orders")
      .update({
        status: "pending",
        provider_status: "CREATED",
        provider_reference: null,
        provider_link: null,
        provider_link_expires_at: null,
        external_id: order.external_id ?? order.id,
        utm_source: data.utmSource ?? null,
        utm_medium: data.utmMedium ?? null,
        utm_campaign: data.utmCampaign ?? null,
        utm_content: data.utmContent ?? null,
        utm_term: data.utmTerm ?? null,
        fbclid: data.fbclid ?? null,
      })
      .eq("id", order.id);
    if (resetError) throw resetError;

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
        redirectUrl: `${origin}/credits?plan=${data.plan}&cycle=${data.cycle}&payment=return&orderId=${order.id}`,
        userId,
        externalId: order.external_id ?? order.id,
        message: `Loopster ${plan.name} · ${data.cycle === "yearly" ? "12 mois" : "30 jours"}`,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      link?: string;
      transId?: string;
      message?: string;
    };
    if (!response.ok || !body.link || !body.transId || !isFapshiLink(body.link)) {
      await supabaseAdmin
        .from("payment_orders")
        .update({ status: "failed", provider_status: "FAILED" })
        .eq("id", order.id);
      throw new Error(body.message ?? "Le paiement n'a pas pu être préparé.");
    }

    const { error: saveError } = await supabaseAdmin
      .from("payment_orders")
      .update({
        provider_reference: body.transId,
        provider_status: "CREATED",
        provider_link: body.link,
        provider_link_expires_at: new Date(Date.now() + PAYMENT_LINK_TTL_MS).toISOString(),
      })
      .eq("id", order.id);
    if (saveError) throw saveError;

    return { link: body.link, transId: body.transId, orderId: order.id };
  });

type FapshiStatusResponse = {
  transId?: string;
  externalId?: string;
  status?: string;
  amount?: number;
  revenue?: number;
  [key: string]: unknown;
};

/** Reconciles a hosted checkout return if the Fapshi webhook is delayed. */
export const syncFapshiPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("payment_orders")
      .select("id,user_id,provider_reference,external_id,status,amount_xaf")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Commande de paiement introuvable.");
    if (order.status === "paid" || order.status === "failed" || order.status === "expired") {
      return order;
    }
    if (!order.provider_reference) return order;

    const apiKey = cleanSecret(process.env.FAPSHI_API_KEY);
    const apiUser = cleanSecret(process.env.FAPSHI_API_USER);
    const baseUrl = getFapshiBaseUrl();
    if (!apiKey || !apiUser) throw new Error("Le paiement n'est pas encore activé sur Loopster.");

    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/payment-status/${encodeURIComponent(order.provider_reference)}`,
      { headers: { apikey: apiKey, apiuser: apiUser } },
    );
    const body = (await response.json().catch(() => ({}))) as FapshiStatusResponse;
    if (!response.ok || !body.status || typeof body.amount !== "number") return order;

    const { error: activationError } = await supabaseAdmin.rpc("activate_payment_order", {
      _provider_reference: order.provider_reference,
      _external_id: body.externalId ?? order.external_id,
      _provider_status: body.status,
      _amount_xaf: body.amount,
      _revenue_xaf: typeof body.revenue === "number" ? body.revenue : body.amount,
      _payload: body as unknown as Json,
    });
    if (activationError) throw activationError;

    const { data: refreshed, error: refreshError } = await supabaseAdmin
      .from("payment_orders")
      .select("id,user_id,provider_reference,external_id,status,amount_xaf,plan,cycle,expires_at")
      .eq("id", data.orderId)
      .single();
    if (refreshError) throw refreshError;
    return refreshed;
  });
