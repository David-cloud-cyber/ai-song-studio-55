import { createFileRoute } from "@tanstack/react-router";

type FapshiEvent = {
  transId?: string;
  status?: "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";
  amount?: number;
};

export const Route = createFileRoute("/api/public/fapshi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedSecret = process.env.FAPSHI_WEBHOOK_SECRET;
        const receivedSecret = request.headers.get("x-wh-secret");
        if (!expectedSecret || receivedSecret !== expectedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let event: FapshiEvent;
        try {
          event = (await request.json()) as FapshiEvent;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        if (!event.transId || !event.status || typeof event.amount !== "number") {
          return new Response("ok");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("activate_payment_order", {
          _provider_reference: event.transId,
          _provider_status: event.status,
          _amount_xaf: event.amount,
        });

        if (error) return new Response("Unable to process payment", { status: 500 });
        return new Response("ok");
      },
    },
  },
});
