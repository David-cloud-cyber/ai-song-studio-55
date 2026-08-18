import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Sparkles, Music, Zap, Cpu, Shield, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog · Loopster" },
      {
        name: "description",
        content:
          "Historique des mises à jour, nouvelles fonctionnalités et améliorations de Loopster.",
      },
    ],
  }),
  component: ChangelogPage,
});

const updates = [
  {
    version: "v2.5.0",
    date: "18 Août 2026",
    badge: "Majeur",
    title: "Créations plus fiables, écoute immédiate",
    description:
      "Les nouvelles créations sont conservées dans ton espace et peuvent être écoutées directement depuis la bibliothèque.",
    changes: [
      {
        icon: Music,
        label: "Lecture",
        text: "Un lecteur avec lecture, pause, progression et reprise accompagne chaque morceau prêt.",
      },
      {
        icon: Shield,
        label: "Fichiers",
        text: "Les fichiers générés sont conservés dans Loopster avant d'être proposés à l'écoute.",
      },
      {
        icon: Sparkles,
        label: "Création",
        text: "Le studio utilise désormais le modèle Loopster sélectionné et évite les options non prises en charge.",
      },
    ],
  },
  {
    version: "v2.4.0",
    date: "28 Juillet 2026",
    badge: "Feature",
    title: "Un studio plus clair sur mobile",
    description:
      "La création, la bibliothèque et les détails d'un projet s'adaptent aux petits écrans sans couper les actions importantes.",
    changes: [
      {
        icon: Zap,
        label: "Navigation",
        text: "Les actions principales restent accessibles avec des boutons adaptés au toucher.",
      },
      {
        icon: Sparkles,
        label: "Prompts",
        text: "Les idées de départ sont transmises comme des descriptions créatives, sans les confondre avec des paroles.",
      },
      {
        icon: Shield,
        label: "Confiance",
        text: "Les créations privées restent séparées de la galerie publique jusqu'à une publication volontaire.",
      },
    ],
  },
  {
    version: "v2.3.0",
    date: "15 Juillet 2026",
    badge: "Fix",
    title: "Un espace projet mieux organisé",
    description:
      "Chaque création rassemble maintenant son prompt, ses paroles, son audio, ses versions et ses exports au même endroit.",
    changes: [
      {
        icon: Music,
        label: "Versions",
        text: "Les remix, recréations et variantes restent liés au projet d'origine.",
      },
      {
        icon: Sparkles,
        label: "Actions",
        text: "Publier, retirer, remixer et recréer affichent un état clair et évitent les doubles clics.",
      },
    ],
  },
  {
    version: "v2.0.0",
    date: "12 Juin 2026",
    badge: "Lancement",
    title: "Lancement officiel de Loopster v2",
    description:
      "Refonte de l'interface utilisateur, studio pensé pour le mobile et parcours de création musicale depuis une idée écrite.",
    changes: [
      {
        icon: Sparkles,
        label: "Nouveau Studio",
        text: "Architecture mobile-first avec raccourcis gestuels et barre de lecture permanente.",
      },
      {
        icon: Cpu,
        label: "Création musicale",
        text: "Lance une création depuis un prompt et suis son avancement jusqu'à la disponibilité du morceau.",
      },
    ],
  },
];

function ChangelogPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Mises à jour & Nouveautés"
          title="Changelog"
          description="Découvrez les dernières fonctionnalités, corrections et évolutions de la plateforme Loopster."
        />

        <div className="mt-10 space-y-12">
          {updates.map((item, index) => (
            <article
              key={item.version}
              className="relative border-l-2 border-white/10 pl-6 md:pl-8"
            >
              {/* Timeline indicator dot */}
              <div
                className={`absolute -left-[9px] top-1.5 size-4 rounded-full border-2 ${
                  index === 0
                    ? "border-neon bg-background shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                    : "border-zinc-700 bg-background"
                }`}
              />

              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-bold text-neon">{item.version}</span>
                <span className="text-xs text-zinc-500">•</span>
                <time className="text-xs text-zinc-400">{item.date}</time>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                    item.badge === "Majeur"
                      ? "bg-neon/15 text-neon border border-neon/30"
                      : item.badge === "Feature"
                        ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  {item.badge}
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white md:text-2xl">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>

              <div className="mt-5 space-y-3 rounded-2xl border border-white/5 bg-surface/50 p-4">
                {item.changes.map((change, cIdx) => {
                  const Icon = change.icon;
                  return (
                    <div key={cIdx} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-white/5 text-neon">
                        <Icon className="size-3.5" />
                      </div>
                      <div>
                        <span className="font-medium text-zinc-200">{change.label} : </span>
                        <span className="text-zinc-400">{change.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
