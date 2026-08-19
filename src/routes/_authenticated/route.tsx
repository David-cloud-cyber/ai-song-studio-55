import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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
    await ensureAuthRestored().catch(() => null);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
