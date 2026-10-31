import type { MetadataRoute } from 'next';
import { pagesDuSitemap } from '@/features/vitrine/indexation';
import { LANDINGS } from '@ph/core/landings';
import { lireSlugs } from '@/server/annuaire';
import { flagActif } from '@/server/flags';

// Régénéré toutes les heures : les nouvelles fiches en ligne y apparaissent sans redéploiement.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, site, devis] = await Promise.all([
    lireSlugs(),
    flagActif('landingSite'),
    flagActif('landingDevis'),
  ]);
  const landings = [
    LANDINGS.chantiers.route,
    ...(site ? [LANDINGS.site.route] : []),
    ...(devis ? [LANDINGS.devis.route] : []),
  ];
  return pagesDuSitemap(new Date(), slugs, landings);
}
