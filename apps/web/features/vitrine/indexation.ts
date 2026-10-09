import type { MetadataRoute } from 'next';
import { COMMUNES } from '@/features/diagnostic/communes';
import { tousLesDocuments } from '@/features/legal/documents';
import { routes } from '@/lib/routes';
import { absolue } from './seo';

/** Pages publiques indexables : vitrine, annuaire et fiches des artisans en ligne (`slugs`). */
export function pagesDuSitemap(
  maintenant: Date,
  slugs: readonly string[] = [],
): MetadataRoute.Sitemap {
  const page = (
    chemin: string,
    priority: number,
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) => ({
    url: absolue(chemin),
    lastModified: maintenant,
    changeFrequency,
    priority,
  });
  return [
    page(routes.accueil, 1, 'daily'),
    page(routes.pro, 0.9, 'weekly'),
    page(routes.artisans, 0.9, 'daily'),
    ...slugs.map((slug) => page(routes.ficheArtisan(slug), 0.7, 'weekly')),
    page(routes.diagnostic, 0.9, 'weekly'),
    ...COMMUNES.map((c) => page(routes.diagnosticCommune(c.slug), 0.8, 'monthly')),
    page(routes.aide, 0.5, 'monthly'),
    ...tousLesDocuments().map((d) => page(routes.legal(d.public, d.doc), 0.2, 'yearly')),
  ];
}

/** Hors production (préproduction, aperçus), rien n'est indexé. */
export function reglesRobots(production: boolean): MetadataRoute.Robots {
  if (!production) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/pro/',
          '/mon-espace',
          '/preferences',
          '/connexion',
          '/maintenance',
        ],
      },
    ],
    sitemap: absolue('/sitemap.xml'),
  };
}
