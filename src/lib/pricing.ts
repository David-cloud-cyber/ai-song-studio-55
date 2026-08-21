export type PricingPlanId = "free" | "pro" | "premier";
export type BillingCycle = "monthly" | "yearly";

export type PricingFeature = {
  label: string;
  included: boolean;
};

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  audience: string;
  monthlyPriceXaf: number;
  yearlyPriceXaf: number;
  yearlySavings?: string;
  credits: number;
  creationsLabel: string;
  badge?: string;
  features: PricingFeature[];
  details: PricingFeature[];
};

/**
 * Source unique des offres affichées dans Loopster.
 * Les prix annuels correspondent à dix mensualités : l'économie est affichée clairement.
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Gratuit",
    audience: "Découvrir Loopster sans carte.",
    monthlyPriceXaf: 0,
    yearlyPriceXaf: 0,
    credits: 80,
    creationsLabel: "Environ 1 création standard par jour",
    features: [
      { label: "80 crédits renouvelés chaque jour", included: true },
      { label: "Créations standard", included: true },
      { label: "Écoute dans ta bibliothèque", included: true },
      { label: "Créations terminées publiées dans la galerie", included: true },
      { label: "Export des créations", included: false },
      { label: "Droits commerciaux", included: false },
    ],
    details: [
      { label: "File de génération partagée", included: true },
      { label: "Pochettes et paroles", included: true },
      { label: "Séparation de pistes", included: false },
      { label: "Upload audio", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    audience: "Créer et exporter tes morceaux.",
    monthlyPriceXaf: 5900,
    yearlyPriceXaf: 59000,
    yearlySavings: "2 mois offerts · 11 800 XAF économisés",
    credits: 2500,
    creationsLabel: "Jusqu'à 31 créations standard par période",
    badge: "Le plus populaire",
    features: [
      { label: "2 500 crédits par période", included: true },
      { label: "Export MP3 et WAV", included: true },
      { label: "Droits commerciaux inclus", included: true },
      { label: "Meilleur modèle disponible", included: true },
      { label: "File prioritaire", included: true },
    ],
    details: [
      { label: "Paroles, pochettes et clips", included: true },
      { label: "Ajout de voix ou d'instrumentales", included: true },
      { label: "Séparation de voix", included: true },
      { label: "Upload audio jusqu'à 30 minutes", included: true },
      { label: "Création avec ta propre voix", included: false },
      { label: "Séparation avancée", included: false },
    ],
  },
  {
    id: "premier",
    name: "Premier",
    audience: "Produire en volume, simplement.",
    monthlyPriceXaf: 15900,
    yearlyPriceXaf: 159000,
    yearlySavings: "2 mois offerts · 31 800 XAF économisés",
    credits: 10000,
    creationsLabel: "Jusqu'à 125 créations standard par période",
    badge: "Meilleure valeur",
    features: [
      { label: "10 000 crédits par période", included: true },
      { label: "Tous les exports audio et vidéo", included: true },
      { label: "Droits commerciaux inclus", included: true },
      { label: "Tous les outils de séparation", included: true },
      { label: "Jusqu'à 10 créations en parallèle", included: true },
    ],
    details: [
      { label: "Meilleur modèle disponible", included: true },
      { label: "Ajout de voix ou d'instrumentales", included: true },
      { label: "Upload audio jusqu'à 30 minutes", included: true },
      { label: "Création avec ta propre voix", included: true },
      { label: "Séparation avancée", included: true },
      { label: "Accès anticipé aux nouveautés", included: true },
    ],
  },
];

export function getPricingPlan(plan: string | undefined): PricingPlan {
  return PRICING_PLANS.find((item) => item.id === plan) ?? PRICING_PLANS[0];
}

export function getPriceXaf(plan: PricingPlan, cycle: BillingCycle): number {
  return cycle === "yearly" ? plan.yearlyPriceXaf : plan.monthlyPriceXaf;
}

export function formatXaf(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

export function cycleLabel(cycle: BillingCycle): string {
  return cycle === "yearly" ? "12 mois" : "30 jours";
}

export function isPaidPricingPlan(plan: string | undefined): plan is "pro" | "premier" {
  return plan === "pro" || plan === "premier";
}
