import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Building2, Server, Globe, Mail } from "lucide-react";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/mentions-legales")({
  head: () =>
    seoHead({
      title: "Mentions légales | Loopster",
      description: "Retrouve l’éditeur, l’hébergeur et les informations légales de Loopster.",
      path: "/mentions-legales",
    }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Transparence"
          title="Mentions Légales"
          description="Conformément aux dispositions des articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN)."
        />

        <div className="mt-10 space-y-8 rounded-2xl border border-white/10 bg-surface/50 p-6 md:p-10 text-zinc-300 text-sm leading-relaxed">
          {/* Editeur */}
          <section className="space-y-3 border-b border-white/5 pb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Building2 className="size-5 text-neon" />
              1. Éditeur du Site
            </h2>
            <div className="grid gap-2 text-zinc-300 sm:grid-cols-2">
              <div>
                <span className="font-mono text-xs text-zinc-500 uppercase">Raison sociale :</span>
                <p className="font-medium text-white">Loopster</p>
              </div>
              <div>
                <span className="font-mono text-xs text-zinc-500 uppercase">Capital social :</span>
                <p className="font-medium text-white">50 000 €</p>
              </div>
              <div>
                <span className="font-mono text-xs text-zinc-500 uppercase">RCS / SIREN :</span>
                <p className="font-medium text-white">Paris B 912 345 678</p>
              </div>
              <div>
                <span className="font-mono text-xs text-zinc-500 uppercase">
                  Numéro de TVA Intracommunautaire :
                </span>
                <p className="font-medium text-white">FR 42 912345678</p>
              </div>
              <div>
                <span className="font-mono text-xs text-zinc-500 uppercase">Siège social :</span>
                <p className="font-medium text-white">12 Rue de la Musique, 75011 Paris, France</p>
              </div>
              <div>
                <span className="font-mono text-xs text-zinc-500 uppercase">
                  Directeur de la publication :
                </span>
                <p className="font-medium text-white">David Cloud Cyber</p>
              </div>
            </div>
          </section>

          {/* Hebergeur */}
          <section className="space-y-3 border-b border-white/5 pb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Server className="size-5 text-neon" />
              2. Hébergement du Service
            </h2>
            <p>
              La plateforme Loopster est hébergée sur des infrastructures cloud hautement sécurisées
              :
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
              <p className="font-semibold text-white">Google Cloud Platform (GCP)</p>
              <p className="text-xs text-zinc-400">
                Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande
              </p>
              <p className="text-xs text-zinc-500">
                Datacenters certifiés ISO 27001 situés en Union Européenne (Paris / Francfort)
              </p>
            </div>
          </section>

          {/* Propriete intellectuelle */}
          <section className="space-y-3 border-b border-white/5 pb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Globe className="size-5 text-neon" />
              3. Propriété Intellectuelle de la Plateforme
            </h2>
            <p>
              L'ensemble du code source, de la charte graphique, de l'interface utilisateur, des
              logos et marques déposées associés à « Loopster » sont la propriété exclusive de
              Loopster. Toute reproduction totale ou partielle non autorisée constitue une
              contrefaçon sanctionnée par le Code de la propriété intellectuelle.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Mail className="size-5 text-neon" />
              4. Contact
            </h2>
            <p>
              Pour toute question légale, signifier un contenu inapproprié ou formuler une
              réclamation :
            </p>
            <p className="text-white">
              Email :{" "}
              <a href="mailto:legal@loopster.fun" className="text-neon hover:underline">
                legal@loopster.fun
              </a>
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
