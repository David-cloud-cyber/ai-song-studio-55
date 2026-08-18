import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Lock, Database, Eye, UserCheck, Shield } from "lucide-react";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seoHead({
      title: "Politique de confidentialité | Loopster",
      description: "Découvre comment Loopster protège et utilise tes données personnelles.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Protection des Données"
          title="Politique de Confidentialité"
          description="Dernière mise à jour : 28 Juillet 2026. Découvrez comment Loopster collecte, protège et utilise vos données personnelles conformément au RGPD."
        />

        <div className="mt-10 space-y-8 rounded-2xl border border-white/10 bg-surface/50 p-6 md:p-10 text-zinc-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Database className="size-5 text-neon" />
              1. Données Collectées
            </h2>
            <p>
              Dans le cadre de l'utilisation du Service, nous sommes amenés à collecter les
              catégories de données suivantes :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong>Données d'identité :</strong> Nom, prénom, adresse e-mail lors de la
                création du compte.
              </li>
              <li>
                <strong>Données de création :</strong> Prompts texte, styles musicaux enregistrés,
                projets et pistes générées.
              </li>
              <li>
                <strong>Données techniques :</strong> Adresse IP, type de navigateur, jetons de
                session et données de journal de connexion.
              </li>
              <li>
                <strong>Données de facturation :</strong> Historique des transactions et statut des
                abonnements (les données bancaires sont traitées exclusivement par Stripe et ne sont
                jamais stockées sur nos serveurs).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Eye className="size-5 text-neon" />
              2. Utilisation des Données
            </h2>
            <p>Vos données sont traitées pour les finalités suivantes :</p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Fourniture et optimisation du service de génération musicale par IA.</li>
              <li>Gestion des comptes utilisateurs, accès au studio et support technique.</li>
              <li>Sécurisation de la plateforme et prévention de la fraude.</li>
              <li>
                Envoi d'informations sur les mises à jour majeures du produit (vous pouvez vous
                désinscrire à tout moment).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Shield className="size-5 text-neon" />
              3. Sécurité et Confidentialité des Prompts
            </h2>
            <p>
              Vos projets musicaux non publiés et vos idées de créations restent strictement
              confidentiels. Nous ne vendons ni ne louons vos données personnelles ou créatives à
              des tiers. Vos prompts musicaux ne sont pas utilisés pour réentraîner des modèles
              publics sans votre accord explicite.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <UserCheck className="size-5 text-neon" />
              4. Vos Droits (RGPD)
            </h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
              des droits suivants concernant vos données personnelles :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong>Droit d'accès et de rectification :</strong> Consulter et modifier vos
                informations depuis vos réglages.
              </li>
              <li>
                <strong>Droit à l'effacement :</strong> Demander la suppression définitive de votre
                compte et de toutes vos pistes associées.
              </li>
              <li>
                <strong>Droit à la portabilité :</strong> Télécharger vos données et projets dans un
                format lisible.
              </li>
            </ul>
            <p className="pt-2">
              Pour exercer ces droits, contactez notre Délégué à la Protection des Données (DPO) à
              l'adresse :{" "}
              <a href="mailto:dpo@loopster.fun" className="text-neon hover:underline">
                dpo@loopster.fun
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Durée de Conservation</h2>
            <p>
              Vos données de compte sont conservées pendant toute la durée de votre inscription. En
              cas d'inactivité prolongée de plus de 24 mois sans abonnement actif, nous vous
              avertirons avant la suppression définitive des fichiers inactifs.
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
