import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/studio/PageTransition";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { Cookie, Check, Sliders, Info } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politique des Cookies · BeatStudio AI" },
      {
        name: "description",
        content: "Information et gestion des cookies et traceurs sur la plateforme BeatStudio AI.",
      },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <SectionHeader
          eyebrow="Traceurs & Préférences"
          title="Politique des Cookies"
          description="Dernière mise à jour : 28 Juillet 2026. Découvrez le rôle des cookies et comment vous pouvez personnaliser vos préférences."
        />

        <div className="mt-10 space-y-8 rounded-2xl border border-white/10 bg-surface/50 p-6 md:p-10 text-zinc-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Cookie className="size-5 text-neon" />
              1. Qu'est-ce qu'un Cookie ?
            </h2>
            <p>
              Un cookie est un petit fichier texte déposé sur votre ordinateur, tablette ou
              smartphone lors de votre visite sur BeatStudio AI. Il nous permet d'assurer la
              stabilité du studio audio, de mémoriser vos préférences de lecture et de sécuriser
              votre session.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sliders className="size-5 text-neon" />
              2. Types de Cookies Utilisés
            </h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Cookies Essentiels & Techniques</h3>
                  <span className="rounded-full bg-neon/15 border border-neon/30 px-2.5 py-0.5 text-[10px] font-mono text-neon font-semibold uppercase">
                    Toujours Actifs
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Nécessaires au bon fonctionnement du studio, à la conservation de votre session
                  active, à la mémorisation de votre niveau de volume et à l'authentification
                  sécurisée.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Cookies de Performance & Analytique</h3>
                  <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono text-purple-300 font-semibold uppercase">
                    Optionnels
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Mesure anonyme de la fréquentation des pages et des temps d'apprentissage des
                  modèles afin d'améliorer l'ergonomie globale de BeatStudio.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Info className="size-5 text-neon" />
              3. Gestion de vos Préférences
            </h2>
            <p>
              Vous pouvez à tout moment configurer votre navigateur pour refuser ou supprimer les
              cookies. Notez cependant que la désactivation des cookies essentiels peut altérer les
              performances de lecture audio en direct.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong>Chrome :</strong> Paramètres &gt; Confidentialité et sécurité &gt; Cookies
              </li>
              <li>
                <strong>Firefox :</strong> Options &gt; Vie privée et sécurité &gt; Cookies
              </li>
              <li>
                <strong>Safari :</strong> Préférences &gt; Confidentialité &gt; Bloquer tous les
                cookies
              </li>
            </ul>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
