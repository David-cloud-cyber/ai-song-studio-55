import { Link } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";

export function TopBar() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const credits = profile?.credits ?? 0;
  const initials = profile?.initials ?? "LS";
  const color = profile?.color ?? "from-cyan-400 to-fuchsia-600";
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
        <Link to="/studio" className="flex items-center gap-2">
          <LoopsterLogo compact imageClassName="size-7" />
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            to="/credits"
            className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 ring-1 ring-white/5 transition-colors hover:bg-surface-2"
            aria-busy={profileLoading}
          >
            <span className="size-1.5 animate-pulse rounded-full bg-neon" />
            {profileLoading ? (
              <span
                className="h-3 w-12 animate-pulse rounded bg-white/10"
                aria-label="Chargement"
              />
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                {credits} CR
              </span>
            )}
          </Link>
          <Link
            to="/settings"
            className={`grid size-8 place-items-center rounded-full bg-gradient-to-br ${color} text-[11px] font-semibold text-background ring-1 ring-white/10`}
          >
            {profileLoading ? (
              <span
                className="size-3 animate-pulse rounded bg-background/40"
                aria-label="Chargement"
              />
            ) : (
              initials
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
