import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const metaEventSchema = z.object({
  eventName: z.enum([
    "PageView",
    "ViewContent",
    "CompleteRegistration",
    "FirstGenerationSuccess",
    "InitiateCheckout",
    "Purchase",
    "Subscribe",
  ]),
  eventId: z.string().min(8).max(160),
  eventSourceUrl: z.string().url().max(2000),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const Route = createFileRoute("/api/public/meta-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
        const pixelId = process.env.META_PIXEL_ID;
        if (!accessToken || !pixelId) return new Response(null, { status: 204 });

        let payload: z.infer<typeof metaEventSchema>;
        try {
          payload = metaEventSchema.parse(await request.json());
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const cookies = request.headers.get("cookie") ?? "";
        const getCookie = (name: string) =>
          cookies
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${name}=`))
            ?.slice(name.length + 1);
        const userAgent = request.headers.get("user-agent") ?? undefined;
        const userData = {
          ...(userAgent ? { client_user_agent: userAgent } : {}),
          ...(getCookie("_fbp") ? { fbp: getCookie("_fbp") } : {}),
          ...(getCookie("_fbc") ? { fbc: getCookie("_fbc") } : {}),
        };

        const graphVersion = process.env.META_GRAPH_VERSION ?? "v21.0";
        const response = await fetch(
          `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: [
                {
                  event_name: payload.eventName,
                  event_time: Math.floor(Date.now() / 1000),
                  event_id: payload.eventId,
                  action_source: "website",
                  event_source_url: payload.eventSourceUrl,
                  user_data: userData,
                  custom_data: payload.properties,
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          console.error("Meta Conversions API rejected an event", response.status);
        }
        return new Response(null, { status: response.ok ? 204 : 202 });
      },
    },
  },
});
