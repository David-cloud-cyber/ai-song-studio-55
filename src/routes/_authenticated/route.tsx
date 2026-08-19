import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ensureAuthRestored } from "@/integrations/supabase/auth-state";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () =>
    seoHead({
      title: "Studio Loopster",
      description: "Ton espace privé pour créer et retrouver tes morceaux Loopster.",
      path: "/studio",
      noIndex: true,
    }),
  beforeLoad: async () => {
    const session = await ensureAuthRestored().catch(() => null);
    if (!session?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: session.user };
  },
  component: () => <Outlet />,
});
