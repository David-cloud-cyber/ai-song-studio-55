# Landing page marketing haute conversion

Créer une vraie landing publique à `/` (hors dashboard), inspirée de Suno : hero avec input de prompt central, sections de conversion, CTA vers `/auth`. Le dashboard actuel bascule sur `/studio`.

## Structure de routes

- Renommer `src/routes/index.tsx` (Studio) → `src/routes/_authenticated/studio.tsx`
- Nouveau `src/routes/index.tsx` = landing publique (pas d'AppShell, pas d'OnboardingGate)
- `OnboardingGate` : ne redirige plus depuis `/` (uniquement depuis routes authentifiées première visite après login)
- Après login, redirection vers `/studio` au lieu de `/`
- Mettre à jour tous les `<Link to="/">` internes du dashboard → `/studio` (TopBar, DesktopSidebar, BottomTabs, etc.)

## Sections landing (mobile-first, responsive desktop)

1. **Nav publique sticky** — logo BeatStudio, liens (Fonctionnalités, Templates, Tarifs, Feed), boutons "Connexion" + "Essayer gratuit" (→ `/auth`)
2. **Hero façon Suno**
   - Eyebrow mono neon "AI MUSIC STUDIO · BÊTA OUVERTE"
   - H1 énorme : "Transformez une phrase en morceau complet."
   - Sub : clip + son + pochette + paroles + visualizer
   - **Prompt hero input** central (grand textarea + chips genre/mood + bouton "Générer" pulse neon). Submit → redirige `/auth?next=/create&prompt=...`
   - Ligne sous : "480 crédits offerts · Sans carte bancaire"
   - Aperçu waveform animé + cover mock qui flotte
3. **Logos bar** — "Utilisé par des créateurs de" + noms fictifs (labels/studios)
4. **Feature grid bento** — 6 tuiles : Chansons IA, Instrus, Clips vidéo, Paroles, Pochettes, Visualizers (chacune avec micro-preview visuelle)
5. **Live gallery** — carrousel horizontal de morceaux communautaires (réutilise `ProjectCard` avec données mock du feed)
6. **How it works** — 3 étapes numérotées (Prompt → Génération → Export & remix) avec captures/mockups
7. **Templates showcase** — grille des 6 templates existants avec CTA "Voir tous les templates"
8. **Social proof** — 3 témoignages fictifs (créateurs, artistes) + stats (10k+ morceaux, 3k+ créateurs, 24 genres)
9. **Pricing preview** — 3 cartes (Free / Creator / Studio) reprenant `creditPacks`, CTA "Commencer gratuitement", mention "Paiements bientôt"
10. **FAQ** — 6 questions (accordion shadcn) : IA utilisée, droits d'auteur, export, crédits, collab, offline
11. **Final CTA band** — plein écran néon "Prêt à composer votre premier morceau ?" + gros bouton + rappel 480 crédits
12. **Footer** — colonnes (Produit, Ressources, Légal, Social) + copyright + logo

## Composants nouveaux (`src/components/marketing/`)

- `MarketingNav.tsx` — nav publique sticky avec blur backdrop
- `MarketingFooter.tsx`
- `HeroPromptInput.tsx` — grand composer landing (chips + textarea + submit)
- `FeatureBento.tsx` — grille bento 6 features
- `HowItWorks.tsx`
- `Testimonials.tsx`
- `PricingPreview.tsx`
- `FaqSection.tsx` (Accordion shadcn)
- `FinalCta.tsx`
- `LiveGallery.tsx` (carrousel des tracks)

## Design tokens réutilisés

Même palette Nocturnal Console (zinc-950 + neon cyan #22d3ee). Ajouter dans `styles.css` :

- `--gradient-hero` radial cyan → transparent
- shadow neon renforcée pour hero
- classe utilitaire `.marquee` pour bande logos

Fonts Inter + JetBrains Mono déjà chargées.

## SEO

`head()` landing : title "BeatStudio AI — Créez des morceaux, clips et pochettes par IA", description conversion, og:title / og:description / og:type=website, canonical `/`. Ajouter JSON-LD `SoftwareApplication` (nom, description, offers). Robots index.

## Comportement

- Landing 100% publique, jamais gated (retirer `OnboardingGate` de cette route)
- Prompt hero : au submit, stocke prompt en sessionStorage puis `navigate({ to: '/auth', search: { next: '/create' } })`
- Aucun appel backend (mocks uniquement, cohérent avec phase 1)
- Animations framer-motion : fade+slide sections au scroll (viewport once), pulse neon sur CTA, marquee logos

## Détails techniques

- La landing ne monte pas `AppShell` (pas de tab bar, pas de composer flottant). Elle a sa propre `MarketingNav` + `MarketingFooter`.
- Wrapper `MarketingLayout` local à la route index.
- Redirection post-login (`_authenticated/route.tsx` + `auth.tsx`) : `/` → `/studio` si session existe (on garde `/` = landing marketing).
- Mettre à jour navigation interne du dashboard : logo → `/studio`, pas `/`.
- `OnboardingGate` : appelé uniquement depuis `_authenticated/route.tsx` après auth, pas globalement.

## Ordre d'implémentation

1. Déplacer studio dashboard vers `/studio` + mettre à jour toutes les nav internes
2. Retirer OnboardingGate global, le remettre dans le layout `_authenticated`
3. Créer composants marketing
4. Créer nouveau `src/routes/index.tsx` (landing)
5. Head/SEO + JSON-LD
6. Vérif preview mobile + desktop
