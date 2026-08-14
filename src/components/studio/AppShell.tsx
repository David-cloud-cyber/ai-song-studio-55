import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BottomTabs } from "./BottomTabs";
import { DesktopSidebar } from "./DesktopSidebar";
import { LivePlayerBar } from "./LivePlayerBar";
import { OnboardingGate } from "./OnboardingGate";
import { PromptComposer } from "./PromptComposer";
import { TopBar } from "./TopBar";

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/reset-password",
  "/features",
  "/pricing",
  "/contact",
  "/changelog",
  "/legal",
  "/privacy",
  "/terms",
  "/cookies",
  "/mentions-legales",
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hideComposer =
    pathname.startsWith("/create") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/onboarding");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isPublic = PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === route : pathname.startsWith(route),
  );
  if (isPublic) return <>{children}</>;
  if (isOnboarding)
    return <div className="relative min-h-screen bg-background text-foreground">{children}</div>;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingGate />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(117,230,255,0.10),transparent_75%)]" />
      <DesktopSidebar />
      <div className="md:hidden">
        <TopBar />
      </div>
      <main className="mx-auto w-full min-w-0 max-w-md pb-[calc(16rem+env(safe-area-inset-bottom))] md:ml-64 md:max-w-none md:px-10 md:pb-40 md:pt-6">
        <div className="min-w-0 md:mx-auto md:max-w-6xl">{children}</div>
      </main>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:left-64">
        <div className="mx-auto max-w-md px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-3xl md:pb-4">
          <div className="mb-2 px-1">
            <LivePlayerBar />
          </div>
          {!hideComposer && (
            <div className="mb-3">
              <PromptComposer />
            </div>
          )}
          <div className="md:hidden">
            <BottomTabs />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}
