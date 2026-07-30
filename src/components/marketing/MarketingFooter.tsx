import { Link } from "@tanstack/react-router";

const cols = [
  {
    title: "Produit",
    items: [
      { label: "Fonctionnalités", href: "/#features" },
      { label: "Tarifs", href: "/#pricing" },
      { label: "Templates", href: "/templates" },
      { label: "Feed", href: "/feed" },
    ],
  },
  {
    title: "Ressources",
    items: [
      { label: "Guide de démarrage", href: "/#how" },
      { label: "FAQ", href: "/#faq" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Légal",
    items: [
      { label: "Centre Légal", href: "/legal" },
      { label: "Conditions", href: "/terms" },
      { label: "Confidentialité", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Mentions légales", href: "/mentions-legales" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-neon shadow-[0_0_18px_rgba(34,211,238,0.55)]">
                <span className="size-3 rotate-45 rounded-[3px] bg-background" />
              </span>
              <span className="text-lg font-semibold tracking-tight">BeatStudio</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-zinc-500">
              Le studio de création musicale IA pour créateurs mobile-first. Prompt to song, en
              quelques secondes.
            </p>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-neon/70">
              Bêta ouverte · 2026
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                {c.title}
              </div>
              <ul className="space-y-2.5">
                {c.items.map((it) => (
                  <li key={it.label}>
                    {it.href.startsWith("/") && !it.href.includes("#") ? (
                      <Link
                        to={it.href}
                        className="text-sm text-zinc-300 transition-colors hover:text-neon"
                      >
                        {it.label}
                      </Link>
                    ) : (
                      <a
                        href={it.href}
                        className="text-sm text-zinc-300 transition-colors hover:text-neon"
                      >
                        {it.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/5 pt-6 md:flex-row md:items-center">
          <span className="text-xs text-zinc-500">© 2026 BeatStudio AI. Tous droits réservés.</span>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <a href="#" className="hover:text-neon">
              Twitter
            </a>
            <a href="#" className="hover:text-neon">
              Instagram
            </a>
            <a href="#" className="hover:text-neon">
              TikTok
            </a>
            <a href="#" className="hover:text-neon">
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
