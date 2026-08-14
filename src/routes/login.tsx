import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";

export const Route = createFileRoute("/login")({ component: AuthRouteAlias });
