import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { FileText, ShieldCheck, Scale, AlertCircle } from "lucide-react";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    seoHead({
      title: "Conditions générales d’utilisation | Loopster",
      description: "Consulte les conditions d’utilisation du studio musical Loopster.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Cadre Contractuel"
          title="Conditions Générales d'Utilisation"
          description="Dernière mise à jour : 28 Juillet 2026. Veuillez lire attentivement les présentes conditions régissant l'utilisation de Loopster."
        />

        <div className="mt-10 space-y-8 rounded-2xl border border-white/10 bg-surface/50 p-6 md:p-10 text-zinc-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Scale className="size-5 text-neon" />
              1. Objet et Définitions
            </h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de
              définir les modalités d'accès et d'utilisation de la plateforme Loopster (ci-après «
              le Service »), éditée par la société Loopster.
            </p>
            <p>
              L'accès au Service implique l'acceptation sans réserve des présentes CGU par
              l'utilisateur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ShieldCheck className="size-5 text-neon" />
              2. Propriété Intellectuelle et Droits d'Auteur
            </h2>
            <p>
              <strong>Utilisateurs Gratuits :</strong> Les morceaux musicaux et pistes générés dans
              le cadre d'un compte gratuit sont réservés à un usage strictement personnel et non
              commercial. Toute exploitation sur des plateformes de streaming rémunérées est
              interdite sans formule payante.
            </p>
            <p>
              <strong>Abonnés Payants (Pro & Studio) :</strong> La société cède à l'utilisateur
              l'intégralité des droits d'exploitation commerciale (reproduction, représentation,
              synchronisation vidéo, distribution sur les plateformes musicales telles que Spotify,
              Apple Music, YouTube et TikTok) pour tous les contenus générés pendant la durée de
              l'abonnement actif.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <FileText className="size-5 text-neon" />
              3. Abonnements, Crédits et Paiements
            </h2>
            <p>
              Le Service propose des crédits mensuels rechargeables ainsi que des abonnements
              récurrents.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                Les crédits générés chaque mois sont valables tant que l'abonnement est actif.
              </li>
              <li>
                Le paiement est effectué par carte bancaire sécurisée via notre prestataire certifié
                Stripe.
              </li>
              <li>
                Vous pouvez résilier votre abonnement à tout moment depuis votre espace membre sans
                frais cachés.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <AlertCircle className="size-5 text-neon" />
              4. Règles de Conduite et Interdictions
            </h2>
            <p>Il est strictement interdit d'utiliser Loopster pour :</p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Générer des contenus haineux, diffamatoires, discriminatoires ou illégaux.</li>
              <li>
                Tenter de reproduire à l'identique une œuvre musicale sous droit d'auteur sans
                autorisation préalable des ayants droit.
              </li>
              <li>
                Rétro-concevoir ou altérer le fonctionnement des modèles d'intelligence artificielle
                sous-jacents.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Limitation de Responsabilité</h2>
            <p>
              Loopster met en œuvre tous les moyens raisonnables pour garantir une disponibilité
              continue du Service. Toutefois, nous ne garantissons pas une continuité ininterrompue
              en cas de maintenance ou de panne du réseau tiers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Droit Applicable et Juridiction</h2>
            <p>
              Les présentes CGU sont régies et interprétées conformément au droit français. Tout
              litige relatif à leur interprétation ou exécution relève de la compétence exclusive
              des tribunaux de Paris.
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
