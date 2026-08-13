import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { FREE_DAILY_CREDITS, isPaidPlan } from "@/lib/plans";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";
import {
  Home,
  Library,
  Radio,
  Sparkles,
  LayoutGrid,
  Users,
  CreditCard,
  Settings,
  Sliders,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const nav: NavItem[] = [
  { to: "/studio", label: "Studio", icon: Home, exact: true },
  { to: "/create", label: "Créer", icon: Sparkles },
  { to: "/library", label: "Library", icon: Library },
  { to: "/templates", label: "Templates", icon: LayoutGrid },
  { to: "/collab", label: "Collab", icon: Users },
  { to: "/feed", label: "Feed", icon: Radio },
  { to: "/editor/neon-drift", label: "Éditeur", icon: Sliders },
  { to: "/credits", label: "Crédits", icon: CreditCard },
  { to: "/settings", label: "Compte", icon: Settings },
];

export function DesktopSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const paid = isPaidPlan(profile);
  const credits = paid ? profile?.credits ?? 0 : Math.min(profile?.credits ?? 0, FREE_DAILY_CREDITS);
  const name = profile?.display_name ?? "Créateur";
  const initials = profile?.initials ?? "??";
  const color = profile?.color ?? "from-cyan-400 to-fuchsia-600";
  const plan = paid ? "Loopster Pro" : "Loopster Free";
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-background/80 px-4 py-5 backdrop-blur-xl md:flex">
      <Link to="/studio" className="mb-8 flex items-center gap-2 px-2">
        <LoopsterLogo className="h-8" imageClassName="h-8 w-auto" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname.startsWith(item.to.split("/").slice(0, 2).join("/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as never}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-neon/10 text-neon ring-1 ring-neon/20"
                  : "text-zinc-400 hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={2} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        to="/credits"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-surface p-3 transition-colors hover:bg-surface-2"
      >
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color} text-xs font-semibold text-background`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon">
            {credits} CR · {plan}
          </div>
        </div>
      </Link>
    </aside>
  );
}
