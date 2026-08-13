import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { ShieldCheck, FileText, Lock, Cookie, Scale, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Informations Légales · Loopster" },
      {
        name: "description",
        content:
          "Consultez l'ensemble des documents légaux, conditions d'utilisation, politiques de confidentialité et cookies de Loopster.",
      },
    ],
  }),
  component: LegalOverviewPage,
});

const legalDocs = [
  {
    title: "Mentions Légales",
    to: "/mentions-legales",
    icon: Scale,
    desc: "Informations sur l'éditeur de la plateforme Loopster, l'hébergeur et les droits de propriété intellectuelle.",
  },
  {
    title: "Conditions Générales d'Utilisation (CGU)",
    to: "/terms",
    icon: FileText,
    desc: "Règles d'utilisation du service, gestion des abonnements, génération IA et droits de propriété sur les créations musicales.",
  },
  {
    title: "Politique de Confidentialité",
    to: "/privacy",
    icon: Lock,
    desc: "Engagements de protection de vos données personnelles conformément au RGPD (Règlement Général sur la Protection des Données).",
  },
  {
    title: "Politique des Cookies",
    to: "/cookies",
    icon: Cookie,
    desc: "Détails sur l'utilisation des cookies techniques et de performance nécessaires au bon fonctionnement du studio audio.",
  },
];

function LegalOverviewPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Cadre Juridique"
          title="Centre d'informations Légales"
          description="Chez Loopster, la transparence et la protection de vos droits de création sont nos priorités absolues."
        />

        <div className="mt-8 rounded-2xl border border-neon/30 bg-neon/5 p-5 md:p-6 flex items-start gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neon/15 text-neon">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Vos créations vous appartiennent</h3>
            <p className="mt-1 text-sm text-zinc-300">
              Toutes les pistes musicales, stems et paroles générés avec un compte payant Loopster
              AI sont sous licence commerciale illimitée. Vous conservez 100% de vos droits de
              distribution et de monétisation sur Spotify, Apple Music, YouTube et TikTok.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {legalDocs.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.to}
                to={doc.to}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-surface p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-white/5 text-neon transition-transform group-hover:scale-110">
                      <Icon className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-neon" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-neon transition-colors">
                    {doc.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{doc.desc}</p>
                </div>
                <div className="mt-6 font-mono text-xs uppercase tracking-wider text-neon flex items-center gap-1">
                  <span>Consulter le document</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
