import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { HeroPromptInput } from "@/components/marketing/HeroPromptInput";
import { WaveformBars } from "@/components/studio/WaveformBars";
import { CoverArt } from "@/components/studio/CoverArt";
import { feedItems, templates } from "@/data/mock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Music4,
  Video,
  Mic,
  ImageIcon,
  Waves,
  FileText,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  Users,
  Rocket,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRICING_PLANS,
  cycleLabel,
  formatXaf,
  getPriceXaf,
  type BillingCycle,
} from "@/lib/pricing";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loopster — Créez musique, clips et pochettes par IA" },
      {
        name: "description",
        content:
          "Transformez une phrase en morceau complet : chansons, instrumentales, clips vidéo, paroles et pochettes générés par IA. 80 crédits offerts chaque jour, sans carte bancaire.",
      },
      { property: "og:title", content: "Loopster — Studio de création musicale IA" },
      {
        property: "og:description",
        content:
          "Le studio créatif nouvelle génération : prompt to song en quelques secondes. Bêta ouverte, 80 crédits offerts chaque jour.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://loopster.fun/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://loopster.fun/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Loopster",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          description:
            "Studio de création musicale par IA : chansons, clips vidéo, instrumentales, paroles, pochettes.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
          },
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground">
      <MarketingNav />
      <main className="pt-16">
        <Hero />
        <LogosBar />
        <Features />
        <Gallery />
        <HowItWorks />
        <TemplatesShowcase />
        <SocialProof />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  const sideCards = feedItems.slice(0, 4);
  return (
    <section className="relative min-w-0 overflow-hidden px-4 pb-16 pt-20 sm:px-5 md:pt-28">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_60%_at_50%_10%,rgba(34,211,238,0.20),transparent_70%)]" />
        <div className="absolute inset-x-0 top-[300px] h-[500px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(217,70,239,0.10),transparent_75%)]" />
        <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.6)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      {/* Floating cards — left */}
      <div className="pointer-events-none absolute left-0 top-32 hidden w-[280px] lg:block xl:w-[340px]">
        <FloatingCard item={sideCards[0]} rotate={-8} />
      </div>
      <div className="pointer-events-none absolute -left-10 bottom-8 hidden w-[220px] lg:block">
        <FloatingCard item={sideCards[2]} rotate={6} />
      </div>

      {/* Floating cards — right */}
      <div className="pointer-events-none absolute right-0 top-32 hidden w-[280px] lg:block xl:w-[340px]">
        <FloatingCard item={sideCards[1]} rotate={8} />
      </div>
      <div className="pointer-events-none absolute -right-10 bottom-8 hidden w-[220px] lg:block">
        <FloatingCard item={sideCards[3]} rotate={-6} />
      </div>

      <div className="relative mx-auto w-full min-w-0 max-w-4xl text-center">
        <div className="mx-auto mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-surface/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neon backdrop-blur-xl sm:tracking-[0.24em]">
          <span className="size-1.5 animate-pulse rounded-full bg-neon" />
          AI Music Studio · Bêta ouverte
        </div>

        <h1 className="break-words text-balance text-[clamp(2.35rem,11vw,4.5rem)] font-semibold leading-[1.02] tracking-tight">
          Transforme ton idée en{" "}
          <span className="bg-gradient-to-br from-neon via-cyan-200 to-fuchsia-400 bg-clip-text text-transparent">
            morceau complet
          </span>{" "}
          en quelques instants
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-zinc-400 md:text-lg">
          Décris ton univers, choisis ton ambiance et laisse Loopster donner vie à ta prochaine
          création. Tu peux commencer gratuitement, sans carte bancaire.
        </p>

        <div className="mt-10">
          <HeroPromptInput />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({ item, rotate }: { item: (typeof feedItems)[number]; rotate: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-surface/60 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-transform duration-700"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <CoverArt gradient={item.coverGradient} className="aspect-square">
        <div className="absolute inset-x-3 bottom-3 h-8">
          <WaveformBars peaks={item.waveform.slice(0, 24)} animated />
        </div>
      </CoverArt>
      <div className="p-3 text-left">
        <div className="truncate text-sm font-semibold">{item.title}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          {item.authorHandle}
        </div>
      </div>
    </div>
  );
}

/* ---------------- LOGOS ---------------- */
function LogosBar() {
  const brandLogos = [
    {
      name: "Spotify",
      color: "#1DB954",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.12-.779-.18-.899-.54-.12-.42.18-.78.54-.899 4.62-1.02 8.58-.6 11.7 1.32.42.18.479.659.241 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.841c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
        </svg>
      ),
    },
    {
      name: "Apple Music",
      color: "#FA243C",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.8 12.3c-.1.2-.3.3-.6.3-.1 0-.2 0-.3-.1l-3.2-1.1v-5l4.5-1.5c.3-.1.6.1.6.4v7c0 .1 0 .2-.1.3zm-5 1.7c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5c.3 0 .6.1.8.3v1.4c-.2.8-.8 1.3-1.6 1.3z" />
        </svg>
      ),
    },
    {
      name: "SoundCloud",
      color: "#FF5500",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.175 12.225c-.067 0-.12.053-.12.12v4.838c0 .067.053.12.12.12h.273c.067 0 .12-.053.12-.12v-4.838c0-.067-.053-.12-.12-.12zm.982-1.55c-.067 0-.12.053-.12.12v7.938c0 .067.053.12.12.12h.273c.067 0 .12-.053.12-.12v-7.938c0-.067-.053-.12-.12-.12zm.982-1.088c-.067 0-.12.053-.12.12v10.113c0 .067.053.12.12.12h.273c.067 0 .12-.053.12-.12V9.707c0-.067-.053-.12-.12-.12zm.982-.763c-.067 0-.12.053-.12.12v11.638c0 .067.053.12.12.12h.273c.067 0 .12-.053.12-.12V8.944c0-.067-.053-.12-.12-.12zm.982-.675c-.067 0-.12.053-.12.12v13c0 .067.053.12.12.12h.273c.067 0 .12-.053.12-.12v-13c0-.067-.053-.12-.12-.12zm2.08 13.12h11.13c1.68 0 3.04-1.36 3.04-3.04 0-1.63-1.28-2.96-2.89-3.03-.36-2.52-2.52-4.47-5.14-4.47-1.12 0-2.16.36-3 1-.36-.88-1.2-1.5-2.2-1.5-.72 0-1.36.32-1.8.84V19.88z" />
        </svg>
      ),
    },
    {
      name: "TikTok",
      color: "#00F2FE",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.32V9.12a8.16 8.16 0 0 0 4.85 1.58V7.25a4.85 4.85 0 0 1-.94-.56z" />
        </svg>
      ),
    },
    {
      name: "YouTube Music",
      color: "#FF0000",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm-2.5-10.5v7l6-3.5-6-3.5z" />
        </svg>
      ),
    },
    {
      name: "Ableton",
      color: "#F59E0B",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 6h2v12H2V6zm4 0h2v12H6V6zm4 0h2v12h-2V6zm4 0h2v12h-2V6zm6 0h4v2h-4V6zm0 5h4v2h-4v-2zm0 5h4v2h-4v-2z" />
        </svg>
      ),
    },
    {
      name: "Splice",
      color: "#C084FC",
      icon: (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      name: "Universal Music",
      color: "#38BDF8",
      icon: (
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8M12 3v18" />
        </svg>
      ),
    },
  ];

  const brandsList = [...brandLogos, ...brandLogos, ...brandLogos];

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-zinc-950/80 py-6 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-400">
          Pensé pour accompagner tes outils de création
        </div>
      </div>

      <div className="relative mt-4 flex w-full overflow-hidden before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-24 before:bg-gradient-to-r before:from-zinc-950 before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-24 after:bg-gradient-to-l after:from-zinc-950 after:to-transparent">
        <div className="animate-marquee flex items-center gap-8 sm:gap-12">
          {brandsList.map((brand, i) => (
            <div
              key={`brand-${brand.name}-${i}`}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
            >
              <div style={{ color: brand.color }}>{brand.icon}</div>
              <span className="font-sans text-xs font-semibold tracking-wide text-zinc-200">
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */
const features = [
  {
    icon: Music4,
    title: "Chansons complètes",
    desc: "Voix, instru, mix master en un prompt.",
    span: "md:col-span-2 md:row-span-2",
    accent: true,
  },
  { icon: Waves, title: "Instrumentales", desc: "Beats et loops pro." },
  { icon: Video, title: "Clips vidéo", desc: "Visuels IA synchronisés." },
  { icon: Mic, title: "Voix chantées", desc: "10+ timbres, multi-langues." },
  { icon: FileText, title: "Paroles", desc: "Structure verse/chorus." },
  { icon: ImageIcon, title: "Pochettes", desc: "Album art unique." },
];

function Features() {
  return (
    <section id="features" className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow>Un studio complet</SectionEyebrow>
        <SectionTitle>
          Tout ce qu'il faut pour créer, <span className="text-zinc-500">rien de superflu.</span>
        </SectionTitle>

        <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-3xl border p-6 transition-colors ${
                  f.accent
                    ? "border-neon/20 bg-gradient-to-br from-neon/10 via-surface to-surface"
                    : "border-white/5 bg-surface/60 hover:border-white/10"
                } ${f.span ?? ""}`}
              >
                <div
                  className={`grid size-11 place-items-center rounded-xl ${
                    f.accent ? "bg-neon text-background" : "bg-white/[0.04] text-neon"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 max-w-xs text-sm text-zinc-400">{f.desc}</p>
                {f.accent && (
                  <div className="pointer-events-none absolute inset-x-6 bottom-6 h-10 opacity-70">
                    <WaveformBars peaks={feedItems[0].waveform.slice(0, 32)} animated />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- GALLERY ---------------- */
function Gallery() {
  const items = [...feedItems, ...feedItems];
  return (
    <section id="gallery" className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionEyebrow>Exemples visuels</SectionEyebrow>
        <SectionTitle>
          Des idées qui prennent forme <span className="text-zinc-500">en quelques étapes.</span>
        </SectionTitle>
      </div>
      <div className="no-scrollbar mt-12 flex gap-5 overflow-x-auto px-5 md:px-10">
        {items.map((p, idx) => (
          <div key={`${p.id}-${idx}`} className="w-56 shrink-0">
            <CoverArt gradient={p.coverGradient} className="aspect-square">
              <div className="absolute inset-x-2 bottom-2 h-8">
                <WaveformBars peaks={p.waveform.slice(0, 22)} animated />
              </div>
            </CoverArt>
            <div className="mt-3">
              <div className="truncate text-sm font-semibold">{p.title}</div>
              <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <span>{p.authorHandle}</span>
                <span>Exemple Loopster</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Décrivez votre idée",
      desc: "Un prompt suffit. Ajoutez genre, mood, voix, durée.",
      icon: Sparkles,
    },
    {
      n: "02",
      title: "L'IA compose",
      desc: "Paroles, voix, instru, mix, master et pochette en quelques secondes.",
      icon: Zap,
    },
    {
      n: "03",
      title: "Éditez et exportez",
      desc: "Timeline, stems, effets. Export MP3/WAV, partage direct.",
      icon: Rocket,
    },
  ];
  return (
    <section id="how" className="border-y border-white/5 bg-surface/30 px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow>Workflow</SectionEyebrow>
        <SectionTitle>De l'idée au morceau, en 3 étapes.</SectionTitle>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.n}
                className="relative rounded-3xl border border-white/5 bg-background/60 p-7"
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon">
                  Étape {s.n}
                </div>
                <div className="mt-6 grid size-12 place-items-center rounded-2xl bg-neon/10 text-neon">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TEMPLATES ---------------- */
function TemplatesShowcase() {
  return (
    <section id="templates" className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <SectionEyebrow>Templates</SectionEyebrow>
            <SectionTitle>Démarrez avec un modèle.</SectionTitle>
          </div>
          <Link
            to="/auth"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-neon hover:underline md:inline-flex"
          >
            Tout voir <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group aspect-square rounded-2xl border border-white/5 bg-surface p-4 transition-colors hover:border-neon/30 hover:bg-surface-2"
            >
              <div className="font-mono text-3xl font-bold tracking-tight text-neon">{t.code}</div>
              <div className="mt-auto flex h-full flex-col justify-end">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  {t.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- SOCIAL PROOF ---------------- */
function SocialProof() {
  const stats = [
    { n: "80", l: "crédits offerts chaque jour" },
    { n: "1", l: "création standard gratuite par jour" },
    { n: "0", l: "carte bancaire pour commencer" },
    { n: "100 %", l: "pensé pour les artistes" },
  ];
  const quotes = [
    {
      q: "Pars d'une phrase, d'une ambiance ou d'un refrain et construis ton morceau étape par étape.",
      a: "Ton idée",
      r: "Point de départ",
    },
    {
      q: "Écoute tes créations gratuitement dans ta bibliothèque avant de choisir une formule.",
      a: "Ta bibliothèque",
      r: "Écoute libre",
    },
    {
      q: "Passe à Pro ou Premier quand tu veux exporter et produire avec plus de liberté.",
      a: "Ton rythme",
      r: "Formule flexible",
    },
  ];
  return (
    <section className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border border-white/5 bg-surface/60 px-5 py-6 text-center"
            >
              <div className="text-3xl font-semibold tracking-tight text-neon md:text-4xl">
                {s.n}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {quotes.map((q) => (
            <figure
              key={q.a}
              className="rounded-3xl border border-white/5 bg-surface/60 p-6 md:p-7"
            >
              <div className="text-neon">
                <Sparkles className="size-5" />
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed text-zinc-200">
                "{q.q}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-xs font-semibold text-background">
                  {q.a
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{q.a}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {q.r}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  useEffect(() => {
    trackEvent("pricing_view", { cycle });
  }, [cycle]);

  return (
    <section id="pricing" className="border-y border-white/5 bg-surface/30 px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Commencez à créer <br className="hidden md:block" />
            de la musique gratuitement
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-400">
            Écoute gratuitement. Passe à une formule payante quand tu veux exporter et produire davantage.
          </p>

          {/* Monthly / Yearly toggle */}
          <div
            className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/60 p-1 backdrop-blur-xl"
            role="tablist"
            aria-label="Période de facturation"
          >
            <button
              onClick={() => setCycle("monthly")}
              aria-selected={cycle === "monthly"}
              role="tab"
              className={cn(
                "min-h-10 rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon",
                cycle === "monthly"
                  ? "bg-white/10 text-foreground"
                  : "text-zinc-400 hover:text-foreground",
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setCycle("yearly")}
              aria-selected={cycle === "yearly"}
              role="tab"
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon",
                cycle === "yearly"
                  ? "bg-white/10 text-foreground"
                  : "text-zinc-400 hover:text-foreground",
              )}
            >
              Annuel · 12 mois
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Renouvellement manuel. Aucun coût caché.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PRICING_PLANS.map((p) => {
            const price = getPriceXaf(p, cycle);
            const isPopular = p.id === "pro";
            return (
              <div
                key={p.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-7 transition-all duration-500",
                  isPopular
                    ? "border-neon/40 bg-gradient-to-br from-neon/[0.08] via-surface to-surface shadow-[0_40px_100px_-40px_rgba(34,211,238,0.55)]"
                    : "border-white/10 bg-background/60 hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">{p.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{p.audience}</p>
                  </div>
                  {p.badge && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest",
                        isPopular
                          ? "bg-gradient-to-r from-fuchsia-500 to-orange-400 text-background"
                          : "bg-white/10 text-foreground",
                      )}
                    >
                      {isPopular && <Heart className="size-2.5 fill-current" />}
                      {p.badge}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    {price === 0 ? "Gratuit" : formatXaf(price)}
                  </span>
                  {price > 0 && <span className="text-sm text-zinc-500">/{cycleLabel(cycle)}</span>}
                </div>
                <p className="mt-2 text-sm font-medium text-neon">{p.creationsLabel}</p>
                {cycle === "yearly" && p.yearlySavings && (
                  <p className="mt-1 text-xs text-zinc-400">{p.yearlySavings}</p>
                )}

                <Link
                  to="/auth"
                  search={{ plan: p.id, cycle }}
                  onClick={() => {
                    trackEvent("pricing_plan_selected", { plan: p.id, cycle, amount_xaf: price });
                    if (p.id !== "free") trackEvent("upgrade_started", { plan: p.id, cycle });
                  }}
                  className={cn(
                    "mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon",
                    p.id === "pro" &&
                      "bg-gradient-to-r from-orange-500 via-fuchsia-500 to-fuchsia-600 text-white shadow-[0_10px_40px_-10px_rgba(217,70,239,0.6)]",
                    p.id === "premier" && "bg-foreground text-background",
                    p.id === "free" &&
                      "border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08]",
                  )}
                >
                  {p.id === "free" ? "Commencer gratuitement" : `Choisir ${p.name}`}
                </Link>

                <ul className="mt-7 space-y-3 text-sm">
                  {p.features.filter((f) => f.included).map((f) => (
                    <li key={f.label} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden />
                      <span className="leading-snug text-zinc-200">{f.label}</span>
                    </li>
                  ))}
                </ul>

                <details className="mt-5 border-t border-white/10 pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-300 outline-none focus-visible:ring-2 focus-visible:ring-neon">
                    Voir le détail des fonctions
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                    {p.details.filter((f) => f.included).map((f) => (
                      <li key={f.label} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-zinc-500">
          Les crédits servent aussi aux paroles, aux fichiers WAV, aux vidéos et aux séparations de pistes.
          Une création avancée peut donc utiliser davantage de crédits.
        </p>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
const faqs = [
  {
    q: "Combien puis-je créer gratuitement ?",
    a: "Tu reçois 80 crédits chaque jour, soit environ une création standard. Les crédits se renouvellent automatiquement.",
  },
  {
    q: "Puis-je exporter mes créations ?",
    a: "L'écoute est gratuite dans ta bibliothèque. L'export des morceaux est réservé aux formules Pro et Premier.",
  },
  {
    q: "Les droits commerciaux sont-ils inclus ?",
    a: "Oui, les formules Pro et Premier incluent les droits commerciaux sur les créations éligibles.",
  },
  {
    q: "Que sont les crédits ?",
    a: "Ils servent aux créations et aux outils comme les paroles, le WAV, les vidéos et les séparations de pistes. Les outils avancés utilisent davantage de crédits.",
  },
  {
    q: "Puis-je changer de formule ?",
    a: "Oui. Tu peux choisir une autre formule depuis ton espace avant de lancer le paiement.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Tu choisis une formule, tu vérifies le récapitulatif, puis tu règles en toute sécurité. La formule est activée après confirmation du paiement.",
  },
];

function Faq() {
  return (
    <section id="faq" className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <SectionTitle>Questions fréquentes.</SectionTitle>
        </div>
        <Accordion type="single" collapsible className="mt-12 space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`f-${i}`}
              className="rounded-2xl border border-white/5 bg-surface/60 px-5"
            >
              <AccordionTrigger className="py-5 text-left text-[15px] font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm text-zinc-400">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------------- FINAL CTA ---------------- */
function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-5 md:pb-32">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[28px] border border-neon/20 bg-gradient-to-br from-neon/15 via-surface to-surface p-6 text-center sm:p-10 md:rounded-[36px] md:p-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-64 w-[600px] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(34,211,238,0.35),transparent_70%)]" />
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-neon">
            <Users className="size-3" /> Pour les artistes indépendants
          </div>
          <h2 className="text-balance text-[clamp(2rem,9vw,3rem)] font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Prêt à composer votre <br className="hidden md:block" />
            <span className="bg-gradient-to-br from-neon to-fuchsia-400 bg-clip-text text-transparent">
              premier morceau ?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-full text-sm text-zinc-400 sm:max-w-lg md:text-base">
            80 crédits offerts chaque jour, aucune carte requise. Commence ta première création dès maintenant.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/auth"
              className="neon-pulse inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-neon px-4 py-3.5 text-sm font-semibold text-background sm:w-auto sm:px-6"
            >
              Commencer gratuitement
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#gallery"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium hover:bg-white/[0.06] sm:w-auto sm:px-6"
            >
              Voir des exemples
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- helpers ---------------- */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon">{children}</div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
      {children}
    </h2>
  );
}
