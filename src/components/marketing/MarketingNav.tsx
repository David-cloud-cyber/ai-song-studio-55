import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-white/5 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-neon shadow-[0_0_18px_rgba(34,211,238,0.55)]">
            <span className="size-3 rotate-45 rounded-[3px] bg-background" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">BeatStudio</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            Connexion
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
          >
            Rejoindre gratuitement
          </Link>
        </div>
      </div>
    </header>
  );
}
