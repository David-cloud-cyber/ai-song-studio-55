import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroPromptInput } from "@/components/marketing/HeroPromptInput";
import { HeroMusicStage } from "@/components/marketing/HeroMusicStage";
import { PricingSection } from "@/components/marketing/PricingSection";
import { supabase } from "@/integrations/supabase/client";
import {
  CreationRail,
  FeatureCard as MarketingFeatureCard,
  FinalCta as MarketingFinalCta,
  LogoStrip,
  MarketingShell,
  ProductPreview,
  type PublicCreation,
} from "@/components/marketing/MarketingPrimitives";
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
import { publicSeo, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seoHead({ ...publicSeo.home, path: "/" }),
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

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

function Landing() {
  const {
    data: creations = [],
    isLoading: galleryLoading,
    isError: galleryError,
  } = useQuery({
    queryKey: ["public-creations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_creations")
        .select(
          "id,title,genre,duration_seconds,cover_url,image_url,audio_url,creator_name,published_at",
        )
        .order("published_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as PublicCreation[];
    },
    staleTime: 60_000,
  });

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <MarketingNav />
      <main className="pt-[60px] sm:pt-[68px]">
        <div className="border-b border-border-subtle bg-surface-subtle/50 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:px-6">
          <span className="whitespace-nowrap sm:hidden">
            80 crédits/jour · écoute gratuite · sans carte
          </span>
          <span className="hidden sm:inline">
            80 crédits chaque jour · écoute gratuite · exports réservés aux abonnés
          </span>
        </div>
        <Hero creations={creations} loading={galleryLoading} error={galleryError} />
        <TrustStrip />
        <FeatureSection />
        <GallerySection creations={creations} loading={galleryLoading} error={galleryError} />
        <WorkflowSection />
        <StudioPreviewSection />
        <TemplatesSection />
        <RightsSection />
        <PricingSection />
        <FaqSection />
        <MarketingFinalCta
          title="Ta prochaine idée mérite un espace pour grandir."
          description="Commence gratuitement, écoute le résultat et décide ensuite jusqu’où tu veux l’emmener."
        />
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}

function Hero({
  creations,
  loading,
  error,
}: {
  creations: PublicCreation[];
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 md:pb-28 md:pt-32">
      <div className="hero-gradient-drift pointer-events-none absolute -inset-[12%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(117,230,255,0.34),rgba(181,164,255,0.17)_32%,rgba(255,154,120,0.14)_56%,transparent_76%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_0%,rgba(9,12,16,0.2)_54%,rgba(9,12,16,0.92)_90%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="relative z-10 mx-auto max-w-6xl text-center">
        <p className="relative z-10 font-mono text-[10px] uppercase tracking-[0.26em] text-primary/85">
          Ton espace pour créer
        </p>
        <h1 className="marketing-title relative z-10 mx-auto mt-5 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.05em] sm:text-6xl md:text-7xl">
          Fais entendre ce que tu as en tête.
        </h1>
        <p className="relative z-10 mx-auto mt-5 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
          Décris une idée. Loopster la transforme en morceau que tu peux écouter, affiner et
          partager.
        </p>
        <div className="relative z-20 mt-8">
          <HeroPromptInput />
        </div>
        <HeroMusicStage creations={creations} loading={loading} error={error} />
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-y border-border-subtle bg-surface-subtle/40 px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          De l’intuition au morceau, dans un espace qui suit ton rythme.
        </p>
        <LogoStrip labels={["Morceaux", "Instrumentales", "Voix", "Visuels"]} />
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
          title="Une idée. Plusieurs directions. Un morceau à toi."
          description="Commence avec quelques mots, puis affine chaque détail quand ton projet prend forme."
        />
        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature, index) => (
            <MarketingFeatureCard
              key={feature.title}
              {...feature}
              className={
                index === 0
                  ? "border-primary/35 bg-primary/[0.06] md:col-span-2 lg:col-span-1"
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({
  creations,
  loading,
  error,
}: {
  creations: PublicCreation[];
  loading: boolean;
  error: boolean;
}) {
  return (
    <section
      id="gallery"
      className="overflow-hidden border-y border-border-subtle bg-surface-subtle/35 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionIntro
          eyebrow="Galerie Loopster"
          title="Écoute les créations que la communauté a choisi de partager."
          description="Chaque création affichée ici a été publiée volontairement par son auteur."
        />
      </div>
      <div className="mt-12">
        <CreationRail items={creations} loading={loading} error={error} />
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
        <SectionIntro eyebrow="Ton rythme, ton espace" title="Décris. Écoute. Affine. Publie." />
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

function StudioPreviewSection() {
  return (
    <section className="marketing-section border-y border-border-subtle bg-surface-subtle/35 px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionIntro
          eyebrow="Ton espace de création"
          title="Un studio clair quand ton idée devient plus ambitieuse."
          description="Retrouve ton prompt, tes versions et ta prochaine action au même endroit, sans perdre ton élan."
        />
        <ProductPreview />
      </div>
    </section>
  );
}

function TemplatesSection() {
  const templates = [
    { id: "song", title: "Morceau complet", description: "Voix et instru", icon: AudioLines },
    { id: "instru", title: "Instrumental", description: "Beat et texture", icon: Play },
  ];
  return (
    <section className="marketing-section border-y border-border-subtle bg-surface-subtle/35 px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionIntro
            eyebrow="Points de départ"
            title="Commence avec la forme qui te ressemble."
          />
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
                key={template.id}
                to="/auth"
                search={{ redirect: `/create?template=${template.id}` }}
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

function RightsSection() {
  return (
    <section className="marketing-section px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-primary/30 bg-primary/[0.06] p-6 md:col-span-2 md:p-8">
          <ShieldCheck className="size-6 text-primary" aria-hidden />
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Quand ton projet est prêt
          </p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Écoute gratuitement. Exporte quand ton morceau est prêt.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Tes créations restent dans ta bibliothèque. Les formules payantes débloquent les exports
            et les droits commerciaux selon l’offre choisie.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Formats</p>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> MP3 pour partager vite
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> WAV pour travailler plus loin
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> Visuel vidéo selon disponibilité
            </li>
          </ul>
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
