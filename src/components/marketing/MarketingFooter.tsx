import { Link } from "@tanstack/react-router";
import { LoopsterLogo } from "@/components/branding/LoopsterLogo";

const columns = [
  {
    title: "Produit",
    items: [
      { label: "Fonctionnalités", to: "/features" },
      { label: "Tarifs", to: "/pricing" },
      { label: "Templates", to: "/templates" },
      { label: "Galerie", href: "/#gallery" },
    ],
  },
  {
    title: "Ressources",
    items: [
      { label: "Comment ça marche", href: "/#how" },
      { label: "FAQ", href: "/#faq" },
      { label: "Nouveautés", to: "/changelog" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Légal",
    items: [
      { label: "Centre légal", to: "/legal" },
      { label: "Conditions", to: "/terms" },
      { label: "Confidentialité", to: "/privacy" },
      { label: "Cookies", to: "/cookies" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle bg-background">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center">
              <LoopsterLogo className="h-8" imageClassName="h-8 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Le studio musical IA pour transformer une idée en morceau, puis lui donner la forme
              qui te ressemble.
            </p>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
              Loopster · création libre
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {column.title}
              </div>
              <ul className="space-y-2.5">
                {column.items.map((item) => (
                  <li key={item.label}>
                    {"to" in item ? (
                      <Link
                        to={item.to}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-border-subtle pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© 2026 Loopster. Tous droits réservés.</span>
          <span>Créé pour les artistes indépendants.</span>
        </div>
      </div>
    </footer>
  );
}
