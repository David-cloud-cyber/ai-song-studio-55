import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

const KEY = "loopster.onboarded.v1";

export function OnboardingGate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // A selected paid plan must be reviewable immediately after authentication.
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/credits")) return;
    try {
      const done = window.localStorage.getItem(KEY);
      if (!done) {
        navigate({ to: "/onboarding" });
      }
    } catch {
      /* noop */
    }
  }, [navigate, pathname]);

  return null;
}

export const markOnboardingDone = () => {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* noop */
  }
};
