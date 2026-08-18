import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/register")({
  head: () =>
    seoHead({
      title: "Créer un compte | Loopster",
      description: "Commence à créer avec Loopster.",
      path: "/register",
      noIndex: true,
    }),
  component: AuthRouteAlias,
});
