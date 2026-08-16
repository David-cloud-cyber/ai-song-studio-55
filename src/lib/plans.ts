export const FREE_DAILY_CREDITS = 80;

export const paidPlans = new Set(["pro", "premier", "studio", "creator"]);
export const activeSubscriptionStatuses = new Set(["active", "trialing", "paid"]);

export type PlanProfile = {
  plan?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
};

export function isPaidPlan(profile: PlanProfile | null | undefined) {
  if (!profile?.plan || !paidPlans.has(profile.plan.toLowerCase())) return false;
  const activeStatus =
    !profile.subscription_status ||
    activeSubscriptionStatuses.has(profile.subscription_status.toLowerCase());
  if (!activeStatus) return false;
  if (!profile.subscription_expires_at) return true;
  const expiresAt = Date.parse(profile.subscription_expires_at);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
