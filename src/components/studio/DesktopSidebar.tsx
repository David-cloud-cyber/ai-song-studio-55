import { Link, useRouterState } from "@tanstack/react-router";
import {
  CreditCard,
  Home,
  LayoutGrid,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";
import { useProfile } from "@/hooks/use-profile";
import { FREE_DAILY_CREDITS, isPaidPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  activeWhen?: (pathname: string) => boolean;
};
const nav: NavItem[] = [
  { to: "/studio", label: "Accueil", icon: Home, exact: true },
  { to: "/create", label: "Créer", icon: Sparkles },
  { to: "/library", label: "Bibliothèque", icon: Library },
  { to: "/templates", label: "Templates", icon: LayoutGrid },
  { to: "/collab", label: "Collab", icon: Users },
  { to: "/feed", label: "Galerie", icon: Radio },
  {
    to: "/library",
    label: "Éditeur",
    icon: Sliders,
    activeWhen: (pathname) => pathname.startsWith("/editor/"),
  },
  { to: "/credits", label: "Formules", icon: CreditCard },
  { to: "/settings", label: "Compte", icon: Settings },
];

export function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: profile } = useProfile();
  const paid = isPaidPlan(profile);
  const credits = paid
    ? (profile?.credits ?? 0)
    : Math.min(profile?.credits ?? 0, FREE_DAILY_CREDITS);
  const name = profile?.display_name ?? "Créateur";
  const initials = profile?.initials ?? "??";
  const plan = paid ? `Loopster ${profile?.plan ?? "Pro"}` : "Loopster Free";
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border-subtle bg-background/90 py-5 backdrop-blur-xl transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px] px-3" : "w-64 px-4",
      )}
      data-collapsed={collapsed}
    >
      <div
        className={cn(
          "mb-8 flex items-center",
          collapsed ? "justify-center" : "justify-between px-2",
        )}
      >
        <Link to="/studio" className="flex min-w-0 items-center" aria-label="Accueil Loopster">
          <LoopsterLogo compact={collapsed} className="h-8" imageClassName="h-8 w-auto" />
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            collapsed && "absolute right-2 top-5",
          )}
          aria-label={collapsed ? "Déployer la navigation" : "Replier la navigation"}
          title={collapsed ? "Déployer la navigation" : "Replier la navigation"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Navigation du studio">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : (item.activeWhen?.(pathname) ??
              pathname.startsWith(item.to.split("/").slice(0, 2).join("/")));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as never}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={2} />
              <span className={cn("font-medium", collapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        to="/credits"
        className={cn(
          "mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-surface-elevated",
          collapsed && "justify-center p-2",
        )}
        title={collapsed ? `${name} · ${plan}` : undefined}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
            {credits} CR · {plan}
          </div>
        </div>
      </Link>
    </aside>
  );
}
