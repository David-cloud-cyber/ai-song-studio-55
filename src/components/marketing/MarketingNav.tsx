import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const links = [
  { label: "Fonctionnalités", to: "/features" },
  { label: "Galerie", href: "/#gallery" },
  { label: "Tarifs", to: "/pricing" },
] as const;

export function MarketingNav() {
  const location = useLocation();
  const { user, loading: sessionLoading } = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (link: (typeof links)[number]) => {
    if ("to" in link)
      return location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
    return location.pathname === "/" && location.hash === link.href.slice(1);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled || open
          ? "border-border-subtle bg-background/90 shadow-[0_18px_50px_-32px_rgba(117,230,255,0.8)] backdrop-blur-xl"
          : "border-transparent bg-background/20 backdrop-blur-md",
      )}
      data-scrolled={scrolled}
    >
      <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-[68px] sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 shrink-0 items-center" onClick={() => setOpen(false)}>
          <span className="sm:hidden">
            <LoopsterLogo compact className="size-8" imageClassName="size-8" />
          </span>
          <span className="hidden sm:inline-flex">
            <LoopsterLogo className="h-8" imageClassName="h-8 w-[168px]" />
          </span>
        </Link>

        <nav
          className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex"
          aria-label="Navigation principale"
        >
          {links.map((link) =>
            "to" in link ? (
              <Link
                key={link.label}
                to={link.to}
                className={cn(
                  "relative py-2 transition-colors hover:text-foreground",
                  isActive(link) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute inset-x-2 -bottom-0.5 h-px origin-center bg-primary transition-transform duration-200",
                    isActive(link) ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className={cn(
                  "relative py-2 transition-colors hover:text-foreground",
                  isActive(link) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute inset-x-2 -bottom-0.5 h-px origin-center bg-primary transition-transform duration-200",
                    isActive(link) ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!hydrated || sessionLoading ? (
            <div
              className="h-10 w-24 animate-pulse rounded-full bg-surface/70 sm:w-36"
              aria-hidden="true"
            />
          ) : user ? (
            <Link
              to="/studio"
              className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4 sm:text-sm"
            >
              Ouvrir le studio
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden min-h-10 items-center rounded-full border border-border bg-surface/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex"
              >
                Se connecter
              </Link>
              <Link
                to="/auth"
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4 sm:text-sm"
              >
                <span className="sm:hidden">Créer</span>
                <span className="hidden sm:inline">Créer gratuitement</span>
              </Link>
            </>
          )}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-border bg-surface text-foreground lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 top-full grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 lg:hidden",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "invisible pointer-events-none grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden border-t border-border-subtle bg-background/95 px-4 pb-4 pt-2">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Navigation mobile">
            {links.map((link) =>
              "to" in link ? (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-surface hover:text-foreground",
                    isActive(link) ? "bg-surface text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-surface hover:text-foreground",
                    isActive(link) ? "bg-surface text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </a>
              ),
            )}
            {hydrated && !sessionLoading && (
              <Link
                to={user ? "/studio" : "/auth"}
                onClick={() => setOpen(false)}
                className="mt-1 rounded-xl bg-surface px-3 py-3 text-sm font-semibold text-primary"
              >
                {user ? "Ouvrir le studio" : "Se connecter"}
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
