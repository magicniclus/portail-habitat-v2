/** Adresse publique du site (EMAILS §9) ; repli local pour le développement et la CI. */
export const URL_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const absolue = (chemin: string) =>
  `${URL_SITE}${chemin.startsWith('/') ? '' : '/'}${chemin}`;

export interface QuestionFaq {
  q: string;
  r: string;
}

/** schema.org FAQPage. */
export const faqPage = (faq: readonly QuestionFaq[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.r },
  })),
});

/** schema.org BreadcrumbList ; le dernier élément est la page courante. */
export const filAriane = (etapes: readonly { nom: string; chemin: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: etapes.map((e, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: e.nom,
    item: absolue(e.chemin),
  })),
});

/** schema.org Organization du site (page d'accueil). */
export const organisation = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Portail Habitat',
  url: URL_SITE,
  logo: absolue('/icon.svg'),
});

export interface EntrepriseLocale {
  nom: string;
  chemin: string;
  description: string;
  ville: string;
  codePostal?: string;
  zone?: readonly string[];
  note?: { valeur: number; nombre: number };
}

/** schema.org LocalBusiness (pages communes du diagnostic, fiches artisans). */
export const entrepriseLocale = (e: EntrepriseLocale) => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: e.nom,
  url: absolue(e.chemin),
  description: e.description,
  address: {
    '@type': 'PostalAddress',
    addressLocality: e.ville,
    ...(e.codePostal ? { postalCode: e.codePostal } : {}),
    addressCountry: 'FR',
  },
  ...(e.zone?.length ? { areaServed: e.zone.map((name) => ({ '@type': 'City', name })) } : {}),
  ...(e.note && e.note.nombre > 0
    ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: e.note.valeur,
          reviewCount: e.note.nombre,
        },
      }
    : {}),
});
