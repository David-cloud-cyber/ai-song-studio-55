import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteAlias } from "@/components/auth/AuthRouteAlias";

export const Route = createFileRoute("/register")({ component: AuthRouteAlias });
