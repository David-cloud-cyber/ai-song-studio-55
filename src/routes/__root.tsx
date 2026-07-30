import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScroll } from "@/components/SmoothScroll";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/studio/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-neon">
          Studio · 404
        </div>
        <h1 className="mt-4 text-5xl font-bold tracking-tight">Piste introuvable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cette session n'existe pas ou a été retirée du studio.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-neon px-5 py-2.5 text-sm font-semibold text-background"
        >
          Retour au studio
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Cette page n'a pas chargé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Un souci côté studio. Réessayez ou retournez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-background"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="rounded-full border border-white/10 bg-surface px-4 py-2 text-sm font-medium"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0a0c" },
      { title: "BeatStudio AI — Créez musique, clips et pochettes par IA" },
      {
        name: "description",
        content:
          "BeatStudio AI est le studio créatif nouvelle génération : générez chansons, clips vidéo, instrumentales, paroles et pochettes à partir d'un simple prompt.",
      },
      { name: "author", content: "BeatStudio AI" },
      { property: "og:title", content: "BeatStudio AI — Studio de création musicale IA" },
      {
        property: "og:description",
        content:
          "Chansons, clips, instrus, paroles et pochettes générés par IA. Un studio mobile-first pour créateurs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster theme="dark" position="top-center" />
      </SmoothScroll>
    </QueryClientProvider>
  );
}
