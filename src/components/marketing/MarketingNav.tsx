import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";
import { cn } from "@/lib/utils";

const links = [
  { label: "Fonctionnalités", to: "/features" },
  { label: "Galerie", href: "/#gallery" },
  { label: "Tarifs", to: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled || open
          ? "border-border-subtle bg-background/90 backdrop-blur-xl"
          : "border-transparent bg-background/55 backdrop-blur-md",
      )}
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
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden min-h-10 items-center rounded-full border border-border bg-surface/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated sm:inline-flex"
          >
            Se connecter
          </Link>
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Créer</span>
            <span className="hidden sm:inline">Commencer gratuitement</span>
          </Link>
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

      {open && (
        <div className="border-t border-border-subtle bg-background/95 px-4 pb-4 pt-2 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Navigation mobile">
            {links.map((link) =>
              "to" in link ? (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-xl bg-surface px-3 py-3 text-sm font-semibold text-primary"
            >
              Se connecter
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
