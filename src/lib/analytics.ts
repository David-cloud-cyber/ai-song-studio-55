export type LoopsterEvent =
  | "page_view"
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
  | "purchase"
  | "subscription_activated";

export type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

const CONSENT_KEY = "loopster.marketing-consent";

const META_EVENT_NAMES: Partial<Record<LoopsterEvent, string>> = {
  page_view: "PageView",
  pricing_view: "ViewContent",
  signup_completed: "CompleteRegistration",
  first_generation_success: "FirstGenerationSuccess",
  payment_started: "InitiateCheckout",
  purchase: "Purchase",
  subscription_activated: "Subscribe",
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function hasMarketingConsent() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CONSENT_KEY) === "granted";
}

export function setMarketingConsent(value: "granted" | "denied") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent("loopster:marketing-consent", { detail: value }));
}

export function getMarketingAttribution(): AnalyticsProperties {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const get = (key: string) => params.get(key) ?? undefined;
  return {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    utmContent: get("utm_content"),
    utmTerm: get("utm_term"),
    fbclid: get("fbclid"),
  };
}

function eventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toMetaProperties(properties: AnalyticsProperties) {
  const value = properties.amount_xaf ?? properties.value;
  return {
    ...properties,
    ...(typeof value === "number" ? { value, currency: properties.currency ?? "XAF" } : {}),
  };
}

export function trackEvent(name: LoopsterEvent, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;

  const id = eventId();
  const detail = { name, eventId: id, properties };
  window.dispatchEvent(new CustomEvent("loopster:analytics", { detail }));
  window.dataLayer?.push({ event: name, event_id: id, ...properties });

  const metaName = META_EVENT_NAMES[name];
  if (!metaName || !hasMarketingConsent()) return;

  const metaProperties = toMetaProperties(properties);
  window.fbq?.("track", metaName, metaProperties, { eventID: id });
  void fetch("/api/public/meta-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      eventName: metaName,
      eventId: id,
      eventSourceUrl: window.location.href,
      properties: metaProperties,
    }),
  }).catch(() => undefined);
}
