export const SITE_URL = "https://loopster.fun";
export const OG_IMAGE_URL = `${SITE_URL}/loopster-logo-source.png`;

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function seoHead({
  title,
  description,
  path,
  type = "website",
  noIndex = false,
}: SeoOptions) {
  const canonical = new URL(path, SITE_URL).toString();
  const robots = noIndex
    ? "noindex, nofollow, noarchive"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "Loopster" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: canonical },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:alt", content: "Logo Loopster" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: OG_IMAGE_URL },
      { name: "twitter:image:alt", content: "Logo Loopster" },
    ],
    links: [
      { rel: "canonical", href: canonical },
      { rel: "alternate", hrefLang: "fr", href: canonical },
      { rel: "alternate", hrefLang: "x-default", href: canonical },
    ],
  };
}

export const publicSeo = {
  home: {
    title: "Loopster — Crée ta musique avec l’IA",
    description:
      "Loopster est le studio musical IA pour transformer une idée en morceau, instrumentale, paroles et univers visuel.",
  },
  features: {
    title: "Fonctionnalités de création musicale IA | Loopster",
    description:
      "Découvre les outils Loopster pour créer des chansons, instrumentales, paroles, pochettes et versions musicales à partir d’une idée.",
  },
  pricing: {
    title: "Tarifs du studio musical IA | Loopster",
    description:
      "Compare les formules Free, Pro et Premier de Loopster pour créer, écouter et exporter ta musique selon ton rythme.",
  },
  templates: {
    title: "Templates pour créer une chanson et une instrumentale | Loopster",
    description:
      "Pars d’un template Loopster pour créer rapidement une chanson ou une instrumentale dans le style qui te ressemble.",
  },
  gallery: {
    title: "Galerie de créations musicales IA | Loopster",
    description:
      "Écoute les morceaux publiés par les créateurs Loopster et découvre de nouvelles idées musicales.",
  },
};
