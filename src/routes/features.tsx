import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Clapperboard,
  Image,
  Mic2,
  PenLine,
  WandSparkles,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Fonctionnalités — Loopster" },
      { name: "description", content: "Découvre les outils de création musicale de Loopster." },
    ],
  }),
  component: FeaturesPage,
});

const features = [
  {
    icon: AudioLines,
    title: "Morceaux complets",
    description:
      "Pars d’un prompt pour explorer une direction musicale avec voix, instru et structure.",
  },
  {
    icon: WandSparkles,
    title: "Création guidée",
    description:
      "Utilise des modèles, des styles et des suggestions pour garder le plaisir de commencer.",
  },
  {
    icon: Mic2,
    title: "Voix et instrumentales",
    description: "Teste différentes couleurs musicales et trouve le ton qui accompagne ton idée.",
  },
  {
    icon: PenLine,
    title: "Paroles",
    description: "Donne une structure à ton intention avec couplets, refrains et ambiances.",
  },
  {
    icon: Clapperboard,
    title: "Clips vidéo",
    description: "Prépare un univers visuel cohérent pour prolonger ton morceau.",
  },
  {
    icon: Image,
    title: "Pochettes",
    description: "Crée une première identité visuelle pour présenter ton projet.",
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main className="px-4 pb-24 pt-32 sm:px-6 md:pb-32">
        <section className="mx-auto max-w-5xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            Fonctionnalités Loopster
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Un espace pour aller de l’intuition à la création.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Chaque outil est là pour t’aider à avancer, sans te demander de connaître toutes les
            règles avant de commencer.
          </p>
        </section>
        <section className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-border bg-surface p-6 sm:p-7"
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-surface-elevated text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-8 text-xl font-semibold tracking-tight">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>
        <section className="mx-auto mt-16 max-w-3xl rounded-3xl border border-primary/30 bg-primary/[0.06] p-7 text-center sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Commence par une seule idée.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Tu pourras toujours ajouter des détails une fois que la direction te plaît.
          </p>
          <Link
            to="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Créer gratuitement <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
