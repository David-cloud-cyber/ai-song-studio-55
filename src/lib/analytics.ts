export type LoopsterEvent =
  | "pricing_view"
  | "pricing_plan_selected"
  | "signup_started"
  | "signup_completed"
  | "first_generation_started"
  | "first_generation_success"
  | "upgrade_started"
  | "checkout_viewed"
  | "payment_started"
  | "payment_success"
  | "payment_failed"
  | "subscription_activated";

export function trackEvent(
  name: LoopsterEvent,
  properties: Record<string, string | number | boolean | undefined> = {},
) {
  if (typeof window === "undefined") return;

  const detail = { name, properties };
  window.dispatchEvent(new CustomEvent("loopster:analytics", { detail }));

  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  dataLayer?.push({ event: name, ...properties });
}
