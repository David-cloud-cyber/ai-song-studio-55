import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () =>
    seoHead({
      title: "Mot de passe oublié | Loopster",
      description: "Récupère l’accès à ton espace Loopster.",
      path: "/forgot-password",
      noIndex: true,
    }),
  component: AuthRouteAlias,
});
