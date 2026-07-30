import { Link } from "@tanstack/react-router";
import { user } from "@/data/mock";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
        <Link to="/studio" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-neon shadow-[0_0_18px_rgba(34,211,238,0.45)]">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-background" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">BeatStudio</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            to="/credits"
            className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 ring-1 ring-white/5 transition-colors hover:bg-surface-2"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-neon" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
              {user.credits} CR
            </span>
          </Link>
          <Link
            to="/settings"
            className={`grid size-8 place-items-center rounded-full bg-gradient-to-br ${user.color} text-[11px] font-semibold text-background ring-1 ring-white/10`}
          >
            {user.initials}
          </Link>
        </div>
      </div>
    </header>
  );
}
