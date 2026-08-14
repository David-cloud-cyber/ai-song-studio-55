import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroPromptInput } from "@/components/marketing/HeroPromptInput";
import { PricingSection } from "@/components/marketing/PricingSection";
import { CoverArt } from "@/components/studio/CoverArt";
import { WaveformBars } from "@/components/studio/WaveformBars";
import { feedItems } from "@/data/mock";
import {
  ArrowRight,
  AudioLines,
  Check,
  Clapperboard,
  Image,
  Mic2,
  PenLine,
  Play,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loopster — Ton studio musical IA" },
      {
        name: "description",
        content: "Transforme une idée en morceau, instru, paroles ou pochette avec Loopster.",
      },
      { property: "og:title", content: "Loopster — Ton studio musical IA" },
      {
        property: "og:description",
        content: "Décris ton univers. Loopster t’aide à créer la suite.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://loopster.fun/" },
    ],
    links: [{ rel: "canonical", href: "https://loopster.fun/" }],
  }),
  component: Landing,
});

const featureCards = [
  {
    icon: AudioLines,
    eyebrow: "Morceau complet",
    title: "Une idée devient une vraie direction musicale.",
    description: "Voix, instru, structure et ambiance réunies dans une seule création.",
  },
  {
    icon: WandSparkles,
    eyebrow: "Création guidée",
    title: "Commence simple, affine à ton rythme.",
    description: "Pars d’un prompt ou d’un modèle, puis ajoute les détails qui font ton style.",
  },
  {
    icon: Mic2,
    eyebrow: "Voix & instrumentales",
    title: "Trouve la couleur qui te ressemble.",
    description:
      "Explore des voix, des textures et des instrumentales pour construire ton univers.",
  },
  {
    icon: PenLine,
    eyebrow: "Paroles",
    title: "Donne des mots à ton idée.",
    description: "Crée une structure claire avec couplets, refrains et intentions de voix.",
  },
  {
    icon: Clapperboard,
    eyebrow: "Clips",
    title: "Prolonge ton morceau en image.",
    description: "Prépare un visuel cohérent pour partager ta création plus largement.",
  },
  {
    icon: Image,
    eyebrow: "Pochettes",
    title: "Une identité visuelle dès le départ.",
    description: "Imagine une pochette qui accompagne l’énergie de ton morceau.",
  },
];

const gallery = [
  {
    title: "Neon Drift",
    genre: "Synthwave",
    gradient: "from-cyan-300 via-blue-600 to-indigo-950",
    index: 0,
  },
  {
    title: "Velvet Morning",
    genre: "R&B",
    gradient: "from-rose-300 via-orange-500 to-slate-950",
    index: 1,
  },
  {
    title: "Low Light Theory",
    genre: "Phonk",
    gradient: "from-violet-400 via-fuchsia-600 to-slate-950",
    index: 2,
  },
  {
    title: "After Rain",
    genre: "Ambient",
    gradient: "from-emerald-300 via-teal-500 to-slate-950",
    index: 3,
  },
  {
    title: "Chrome Echoes",
    genre: "Techno",
    gradient: "from-slate-300 via-slate-600 to-slate-950",
    index: 4,
  },
];

const faqs = [
  {
    question: "Que puis-je créer avec Loopster ?",
    answer:
      "Tu peux partir d’une idée pour créer un morceau complet, une instrumentale, des paroles, une pochette ou un visuel. Les outils disponibles dépendent de ta formule.",
  },
  {
    question: "Puis-je essayer gratuitement ?",
    answer:
      "Oui. Tu reçois 80 crédits chaque jour pour découvrir Loopster et écouter tes créations dans ta bibliothèque, sans carte bancaire.",
  },
  {
    question: "Puis-je télécharger mes créations ?",
    answer:
      "L’écoute reste disponible gratuitement dans Loopster. L’export audio et vidéo est réservé aux formules Pro et Premier.",
  },
  {
    question: "Les droits commerciaux sont-ils inclus ?",
    answer:
      "Les droits commerciaux sont inclus dans les formules Pro et Premier, selon les conditions de la création concernée.",
  },
  {
    question: "Puis-je changer de formule ?",
    answer:
      "Oui. Tu peux choisir une autre formule depuis ton espace et vérifier le récapitulatif avant chaque paiement.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground">
      <MarketingNav />
      <main className="pt-[60px] sm:pt-[68px]">
        <Hero />
        <TrustStrip />
        <FeatureSection />
        <GallerySection />
        <WorkflowSection />
        <TemplatesSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 md:pb-28 md:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(117,230,255,0.16),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          Ton atelier musical, toujours ouvert
        </div>
        <h1 className="marketing-title mx-auto mt-7 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.045em] sm:text-6xl md:text-7xl">
          Fais entendre ce que tu as en tête.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
          Décris une ambiance, un refrain ou une énergie. Loopster t’aide à transformer ton idée en
          morceau, puis à lui donner ta propre direction.
        </p>
        <div className="mt-9">
          <HeroPromptInput />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-success" /> 80 crédits chaque jour
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-success" /> Écoute gratuite
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-success" /> Aucune carte bancaire
          </span>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-y border-border-subtle bg-surface-subtle/40 px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Une expérience pensée pour les artistes qui veulent passer de l’intuition à l’action.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:justify-end">
          <span className="rounded-full border border-border bg-surface px-3 py-2">Morceaux</span>
          <span className="rounded-full border border-border bg-surface px-3 py-2">
            Instrumentales
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-2">Voix</span>
          <span className="rounded-full border border-border bg-surface px-3 py-2">Visuels</span>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="marketing-section px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          eyebrow="Un studio qui suit ton idée"
          title="Tout ce qu’il faut pour créer sans perdre le fil."
          description="Des outils simples au premier regard, suffisamment puissants quand ton projet prend de l’ampleur."
        />
        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`group rounded-3xl border p-6 transition-colors hover:border-primary/40 ${index === 0 ? "border-primary/35 bg-primary/[0.06] md:col-span-2 lg:col-span-1" : "border-border bg-surface"}`}
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-surface-elevated text-primary">
                  <Icon className="size-5" />
                </div>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  return (
    <section
      id="gallery"
      className="overflow-hidden border-y border-border-subtle bg-surface-subtle/35 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionIntro
          eyebrow="Aperçu Loopster"
          title="Une idée peut prendre plusieurs formes."
          description="Quelques directions visuelles pour te projeter. Les créations publiques réelles vivent dans la galerie Loopster."
        />
      </div>
      <div className="no-scrollbar mt-12 flex gap-4 overflow-x-auto px-4 sm:px-6 lg:justify-center">
        {gallery.map((item) => (
          <article key={item.title} className="w-56 shrink-0 sm:w-64">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface">
              <CoverArt gradient={item.gradient} className="aspect-square">
                <div className="absolute inset-x-3 bottom-3 h-8">
                  <WaveformBars
                    peaks={(feedItems[item.index]?.waveform ?? [0.3, 0.7, 0.5, 0.9]).slice(0, 24)}
                    animated
                  />
                </div>
                <div className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-foreground backdrop-blur">
                  Aperçu
                </div>
              </CoverArt>
            </div>
            <h3 className="mt-3 truncate text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {item.genre} · création de démonstration
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    {
      number: "01",
      title: "Décris ton idée",
      description: "Une phrase, une ambiance ou quelques mots suffisent pour commencer.",
    },
    {
      number: "02",
      title: "Explore les versions",
      description: "Écoute, compare et garde la direction qui te parle le plus.",
    },
    {
      number: "03",
      title: "Donne-lui ta forme",
      description: "Ajoute des paroles, un visuel, une voix ou prépare ton export.",
    },
  ];
  return (
    <section id="how" className="marketing-section px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          eyebrow="Ton rythme, ton espace"
          title="De l’idée au morceau sans changer de pièce."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-3xl border border-border bg-surface p-6 sm:p-7"
            >
              <span className="font-mono text-sm tracking-[0.22em] text-primary">
                {step.number}
              </span>
              <h3 className="mt-8 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TemplatesSection() {
  const templates = [
    { title: "Morceau complet", description: "Voix et instru", icon: AudioLines },
    { title: "Instrumental", description: "Beat et texture", icon: Play },
    { title: "Paroles", description: "Couplets et refrain", icon: PenLine },
    { title: "Pochette", description: "Identité visuelle", icon: Image },
  ];
  return (
    <section className="marketing-section border-y border-border-subtle bg-surface-subtle/35 px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionIntro eyebrow="Points de départ" title="Commence avec la forme qui t’inspire." />
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-foreground"
          >
            Voir les templates <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Link
                key={template.title}
                to="/auth"
                className="rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-surface-elevated"
              >
                <Icon className="size-5 text-primary" />
                <h3 className="mt-8 text-base font-semibold">{template.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="marketing-section px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-3xl">
        <SectionIntro
          eyebrow="Questions fréquentes"
          title="Tout savoir avant de commencer."
          align="center"
        />
        <Accordion type="single" collapsible className="mt-10 space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="rounded-2xl border border-border bg-surface px-5"
            >
              <AccordionTrigger className="py-5 text-left text-sm font-medium hover:no-underline sm:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6 md:pb-32">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-primary/35 bg-primary/[0.06] p-7 text-center sm:p-12 md:p-16">
        <ShieldCheck className="mx-auto size-7 text-primary" />
        <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Ta prochaine idée mérite un espace pour grandir.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Commence gratuitement, écoute le résultat et décide ensuite comment aller plus loin.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5"
        >
          Créer mon premier morceau <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : "max-w-2xl"}>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      )}
    </div>
  );
}
