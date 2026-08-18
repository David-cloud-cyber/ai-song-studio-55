import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/auth/callback")({
  head: () =>
    seoHead({
      title: "Connexion en cours | Loopster",
      description: "Retour sécurisé vers Loopster.",
      path: "/auth/callback",
      noIndex: true,
    }),
  component: AuthRouteAlias,
});
