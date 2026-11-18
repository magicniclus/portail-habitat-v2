import type { MetadataRoute } from 'next';
import { pagesDuSitemap } from '@/features/vitrine/indexation';
import { LANDINGS } from '@ph/core/landings';
import { lireSlugs } from '@/server/annuaire';
import { routes } from '@/lib/routes';
import { flagActif } from '@/server/flags';

// Régénéré toutes les heures : les nouvelles fiches en ligne y apparaissent sans redéploiement.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, site, devis, dessin, dessinPublic] = await Promise.all([
    lireSlugs(),
    flagActif('landingSite'),
    flagActif('landingDevis'),
    flagActif('dessin'),
    flagActif('dessinPublic'),
  ]);
  const landings = [
    LANDINGS.chantiers.route,
    ...(site ? [LANDINGS.site.route] : []),
    ...(devis ? [LANDINGS.devis.route] : []),
    // Page publique Plans (DES-03) : seulement quand Plans et sa page publique sont ouverts.
    ...(dessin && dessinPublic ? [routes.dessin as string] : []),
  ];
  return pagesDuSitemap(new Date(), slugs, landings);
}
