import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/verify-email")({
  head: () =>
    seoHead({
      title: "Vérifier ton email | Loopster",
      description: "Confirme ton adresse email pour continuer sur Loopster.",
      path: "/verify-email",
      noIndex: true,
    }),
  component: AuthRouteAlias,
});
