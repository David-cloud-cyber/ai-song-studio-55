import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () =>
    seoHead({
      title: "Connexion | Loopster",
      description: "Accède à ton espace Loopster.",
      path: "/login",
      noIndex: true,
    }),
  component: AuthRouteAlias,
});
