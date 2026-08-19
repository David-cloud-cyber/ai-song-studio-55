import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

type FapshiEvent = {
  transId?: string;
  externalId?: string;
  status?: string;
  amount?: number;
  revenue?: number;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/fapshi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedSecret = process.env.FAPSHI_WEBHOOK_SECRET;
        const receivedSecret = request.headers.get("x-wh-secret");
        if (!expectedSecret) {
          return new Response("Payment service unavailable", { status: 503 });
        }
        if (!receivedSecret || !safeEqual(receivedSecret, expectedSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let event: FapshiEvent;
        try {
          event = (await request.json()) as FapshiEvent;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const allowedStatuses = new Set(["CREATED", "PENDING", "SUCCESSFUL", "FAILED", "EXPIRED"]);
        if (
          !event.transId ||
          !event.externalId ||
          !event.status ||
          !allowedStatuses.has(event.status) ||
          typeof event.amount !== "number" ||
          !Number.isFinite(event.amount) ||
          event.amount <= 0
        ) {
          return new Response("Invalid payment event", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: activated, error } = await supabaseAdmin.rpc("activate_payment_order", {
          _provider_reference: event.transId,
          _external_id: event.externalId,
          _provider_status: event.status as
            "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED",
          _amount_xaf: event.amount,
          _revenue_xaf: typeof event.revenue === "number" ? event.revenue : event.amount,
          _payload: event,
        });

        if (error) return new Response("Unable to process payment", { status: 500 });
        if (!activated) return new Response("Payment order not found", { status: 422 });
        return new Response("ok");
      },
    },
  },
});
