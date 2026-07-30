import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomTabs } from "./BottomTabs";
import { LivePlayerBar } from "./LivePlayerBar";
import { PromptComposer } from "./PromptComposer";
import { DesktopSidebar } from "./DesktopSidebar";
import { OnboardingGate } from "./OnboardingGate";
import { useRouterState } from "@tanstack/react-router";

const PUBLIC_ROUTES = ["/", "/auth", "/reset-password"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideComposer =
    pathname.startsWith("/create") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/onboarding");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Landing / auth / reset — no chrome, no onboarding gate.
  if (isPublic) {
    return <>{children}</>;
  }

  if (isOnboarding) {
    return <div className="relative min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingGate />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(34,211,238,0.14),transparent_75%)]" />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Mobile top bar */}
      <div className="md:hidden">
        <TopBar />
      </div>

      <main className="mx-auto max-w-md pb-64 md:ml-64 md:max-w-none md:px-10 md:pb-40 md:pt-6">
        <div className="md:mx-auto md:max-w-6xl">{children}</div>
      </main>

      {/* Floating bottom stack */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:left-64">
        <div className="mx-auto max-w-md px-4 pb-4 md:max-w-3xl">
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
