import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/studio", label: "Accueil" },
  { to: "/library", label: "Bibliothèque" },
  { to: "/feed", label: "Feed" },
  { to: "/settings", label: "Compte" },
] as const;

export function BottomTabs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav
      className="flex h-14 items-center justify-around rounded-full border border-border bg-background/95 px-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      aria-label="Navigation de l’espace"
    >
      {tabs.map((tab) => {
        const active = tab.to === "/studio" ? pathname === "/studio" : pathname.startsWith(tab.to);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("size-1 rounded-full", active ? "bg-primary" : "bg-transparent")} />
            <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.12em]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
