import type { MetadataRoute } from 'next';
import { pagesDuSitemap } from '@/features/vitrine/indexation';
import { lireSlugs } from '@/server/annuaire';

// Régénéré toutes les heures : les nouvelles fiches en ligne y apparaissent sans redéploiement.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return pagesDuSitemap(new Date(), await lireSlugs());
}
