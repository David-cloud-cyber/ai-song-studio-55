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
    version: "v2.4.0",
    date: "28 Juillet 2026",
    badge: "Majeur",
    title: "Moteur audio ultra-fluide & Lenis Smooth Scroll",
    description:
      "Intégration du nouveau système d'animations de défilement doux et optimisation globale de la restitution sonore en temps réel.",
    changes: [
      {
        icon: Zap,
        label: "Expérience Visuelle",
        text: "Ajout du défilement fluide Lenis sur l'ensemble de la plateforme.",
      },
      {
        icon: Cpu,
        label: "Performance",
        text: "Correction des avertissements d'hydratation SSR et rendu ultra-rapide des spectrogrammes.",
      },
      {
        icon: Music,
        label: "Génération Audio",
        text: "Amélioration des transitions de mesure dans l'éditeur de stems.",
      },
    ],
  },
  {
    version: "v2.3.0",
    date: "15 Juillet 2026",
    badge: "Feature",
    title: "Export multi-pistes Stems HD (WAV 24-bit)",
    description:
      "Exportez séparément la batterie, la basse, la mélodie et les voix synthétisées au format studio sans perte.",
    changes: [
      {
        icon: Music,
        label: "Export HD",
        text: "Support de l'export WAV 24-bit 48kHz pour tous les abonnements Pro.",
      },
      {
        icon: Sparkles,
        label: "IA Vocal Engine",
        text: "4 nouveaux timbres vocaux français et anglais ajoutés à la banque IA.",
      },
      {
        icon: Shield,
        label: "Certificat Droits",
        text: "Téléchargement direct de l'attestation de droits d'auteur sous licence commerciale.",
      },
    ],
  },
  {
    version: "v2.1.2",
    date: "02 Juillet 2026",
    badge: "Fix",
    title: "Améliorations de l'éditeur collaboratif",
    description:
      "Mise à jour des sessions de co-création en direct et synchronisation instantanée du lecteur principal.",
    changes: [
      {
        icon: Zap,
        label: "Temps Réel",
        text: "Réduction de la latence de synchronisation sous les 50ms pour les utilisateurs en duo.",
      },
      {
        icon: Sparkles,
        label: "Presets Prompt",
        text: "20 nouveaux templates créatifs ajoutés à la galerie communautaire.",
      },
    ],
  },
  {
    version: "v2.0.0",
    date: "12 Juin 2026",
    badge: "Lancement",
    title: "Lancement officiel de Loopster v2",
    description:
      "Refonte complète de l'interface utilisateur, nouveau studio mobile-first et génération audio instantanée sous Gemini 1.5 Pro audio pipeline.",
    changes: [
      {
        icon: Sparkles,
        label: "Nouveau Studio",
        text: "Architecture mobile-first avec raccourcis gestuels et barre de lecture permanente.",
      },
      {
        icon: Cpu,
        label: "Algorithme BeatGen",
        text: "Génération de morceaux complets en moins de 5 secondes à partir d'un simple texte.",
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
