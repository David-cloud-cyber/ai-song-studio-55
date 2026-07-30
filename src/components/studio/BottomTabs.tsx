import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/studio", label: "Studio" },
  { to: "/library", label: "Library" },
  { to: "/feed", label: "Feed" },
  { to: "/settings", label: "Compte" },
] as const;

export function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex h-14 items-center justify-around rounded-full border border-white/10 bg-background/90 px-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      {tabs.map((t) => {
        const active = t.to === "/studio" ? pathname === "/studio" : pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
              active ? "text-neon" : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            <span className={cn("size-1 rounded-full", active ? "bg-neon" : "bg-transparent")} />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em]">
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
