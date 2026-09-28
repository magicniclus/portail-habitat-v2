/** Champs publics utiles aux données structurées d'une fiche (FIC-03). */
export interface FicheJsonLd {
  slug: string;
  nomCommercial: string;
  pitch: string;
  description: string;
  ville: string;
  logoUrl?: string;
  geo: { latitude: number; longitude: number };
  noteMoyenne: number;
  nbAvis: number;
  telephone: string | null;
}

/**
 * JSON-LD `LocalBusiness` (FIC-03). La note n'est déclarée qu'avec au moins un avis publié
 * (sinon Google refuse le balisage) ; seules des données déjà visibles sur la page y figurent.
 */
export function jsonLdArtisan(f: FicheJsonLd, urlSite: string): Record<string, unknown> {
  const url = `${urlSite}/artisans/${f.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name: f.nomCommercial,
    url,
    description: (f.pitch || f.description).slice(0, 300),
    ...(f.logoUrl ? { image: f.logoUrl } : {}),
    ...(f.telephone ? { telephone: f.telephone } : {}),
    address: { '@type': 'PostalAddress', addressLocality: f.ville, addressCountry: 'FR' },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: Math.round(f.geo.latitude * 1000) / 1000,
      longitude: Math.round(f.geo.longitude * 1000) / 1000,
    },
    ...(f.nbAvis > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round(f.noteMoyenne * 10) / 10,
            reviewCount: f.nbAvis,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}
