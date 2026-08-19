import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BottomTabs } from "./BottomTabs";
import { DesktopSidebar } from "./DesktopSidebar";
import { LivePlayerBar } from "./LivePlayerBar";
import { OnboardingGate } from "./OnboardingGate";
import { PromptComposer } from "./PromptComposer";
import { TopBar } from "./TopBar";
import { useGenerationRecovery } from "@/hooks/use-generation-recovery";

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/reset-password",
  "/features",
  "/pricing",
  "/contact",
  "/feed",
  "/changelog",
  "/legal",
  "/privacy",
  "/terms",
  "/cookies",
  "/mentions-legales",
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideComposer =
    pathname.startsWith("/create") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/onboarding");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isPublic = PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === route : pathname.startsWith(route),
  );
  useGenerationRecovery();
  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("loopster.sidebar.collapsed") === "true");
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("loopster.sidebar.collapsed", String(next));
      return next;
    });
  };
  if (isPublic) return <>{children}</>;
  if (isOnboarding)
    return <div className="relative min-h-screen bg-background text-foreground">{children}</div>;

  return (
    <div className="relative min-h-screen min-w-0 overflow-x-clip bg-background text-foreground">
      <OnboardingGate />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(117,230,255,0.10),transparent_75%)]" />
      <DesktopSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="md:hidden">
        <TopBar />
      </div>
      <main
        className={
          "mx-auto w-full min-w-0 max-w-md md:mr-0 md:max-w-none md:px-10 md:pb-40 md:pt-6 " +
          (hideComposer
            ? "pb-[calc(8rem+env(safe-area-inset-bottom))] "
            : "pb-[calc(16rem+env(safe-area-inset-bottom))] ") +
          (sidebarCollapsed
            ? "md:ml-[72px] md:w-[calc(100%_-_72px)]"
            : "md:ml-64 md:w-[calc(100%_-_16rem)]")
        }
      >
        <div className="w-full min-w-0 md:mx-auto md:max-w-6xl">{children}</div>
      </main>
      <div
        className={
          "pointer-events-none fixed inset-x-0 bottom-0 z-40 md:right-0 " +
          (sidebarCollapsed ? "md:left-[72px]" : "md:left-64")
        }
      >
        <div className="pointer-events-auto mx-auto min-w-0 max-w-md px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:w-full md:max-w-3xl md:pb-4">
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
