import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";

export function OnboardingGate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();

  useEffect(() => {
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/credits")) return;
    if (sessionLoading || profileLoading || !user || !profile) return;
    if (!profile.onboarding_completed_at) navigate({ to: "/onboarding" });
  }, [navigate, pathname, profile, profileLoading, sessionLoading, user]);

  return null;
}
