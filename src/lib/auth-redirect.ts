const AUTHENTICATED_PATHS = [
  "/library",
  "/studio",
  "/create",
  "/credits",
  "/settings",
  "/collab",
  "/onboarding",
  "/editor",
  "/feed",
] as const;

export type AuthPlan = "free" | "pro" | "premier";
export type AuthCycle = "monthly" | "yearly";

/** Keep authentication returns inside Loopster's authenticated routes. */
export function getSafeAuthDestination(value: unknown): string {
  if (typeof value !== "string") return "/library";

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/library";

  try {
    const parsed = new URL(candidate, "https://loopster.invalid");
    const allowed = AUTHENTICATED_PATHS.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );

    if (!allowed) return "/library";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/library";
  }
}

export function buildAuthReturnUrl(
  origin: string,
  destination: unknown,
  options: {
    path?: "/auth" | "/reset-password";
    plan?: AuthPlan;
    cycle?: AuthCycle;
    autopay?: boolean;
    paymentRequestId?: string;
  } = {},
) {
  const url = new URL(options.path ?? "/auth", origin);
  url.searchParams.set("redirect", getSafeAuthDestination(destination));
  if (options.plan) url.searchParams.set("plan", options.plan);
  if (options.cycle) url.searchParams.set("cycle", options.cycle);
  if (options.autopay) url.searchParams.set("autopay", "1");
  if (options.paymentRequestId) url.searchParams.set("paymentRequestId", options.paymentRequestId);
  return url.toString();
}
