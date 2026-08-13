import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";

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
      <div className="mx-auto flex h-16 min-w-0 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-5 md:px-8">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <span className="sm:hidden">
            <LoopsterLogo compact className="size-8" imageClassName="size-8" />
          </span>
          <span className="hidden min-w-0 sm:inline-flex">
            <LoopsterLogo className="h-8 max-w-full" imageClassName="h-8 w-[180px] max-w-full" />
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-zinc-400 md:flex" aria-label="Navigation principale">
          <a className="transition-colors hover:text-foreground" href="/#gallery">
            Galerie
          </a>
          <a className="transition-colors hover:text-foreground" href="/#pricing">
            Tarifs
          </a>
          <a className="transition-colors hover:text-foreground" href="/#faq">
            FAQ
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            to="/auth"
            className="hidden min-h-10 items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] sm:inline-flex sm:px-4"
          >
            Connexion
          </Link>
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background transition-transform hover:scale-[1.02] sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Créer</span>
            <span className="hidden sm:inline">Rejoindre gratuitement</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
