import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScroll } from "@/components/SmoothScroll";
import { AppShell } from "@/components/studio/AppShell";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#090c10" },
      { title: "Loopster — Ton studio musical IA" },
      {
        name: "description",
        content: "Transforme une idée en morceau, instru, paroles ou pochette avec Loopster.",
      },
      { name: "author", content: "Loopster" },
      { property: "og:title", content: "Loopster — Ton studio musical IA" },
      {
        property: "og:description",
        content: "Décris ton univers. Loopster t’aide à créer la suite.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico?v=loopster-3", type: "image/x-icon", sizes: "32x32" },
      { rel: "icon", href: "/favicon.svg?v=loopster-3", type: "image/svg+xml", sizes: "any" },
      { rel: "shortcut icon", href: "/favicon.ico?v=loopster-3", type: "image/x-icon" },
      { rel: "mask-icon", href: "/favicon.svg?v=loopster-3", color: "#75e6ff" },
      { rel: "apple-touch-icon", href: "/loopster-mark.svg?v=loopster-3" },
      { rel: "manifest", href: "/site.webmanifest?v=loopster-3" },
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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Loopster · 404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Cette piste n’existe pas.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La page que tu cherches a peut-être changé de place.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Retour à l’accueil
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Loopster fait une petite pause.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Un contretemps s’est glissé dans la session. Tu peux réessayer ou revenir à l’accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="min-h-11 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
