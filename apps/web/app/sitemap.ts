import type { MetadataRoute } from 'next';
import { pagesDuSitemap } from '@/features/vitrine/indexation';
import { LANDINGS } from '@ph/core/landings';
import { lireSlugs } from '@/server/annuaire';
import { flagActif } from '@/server/flags';
import { metiersPopulaires } from '@/server/metiers';
import { tousLesMetiers, toutesLesPrestations, VILLES_LOCALES } from '@/server/seoLocal';
import { routes } from '@/lib/routes';

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
  // Pages permanentes de référencement local : index, métiers, métiers courants × communes mises
  // en avant, travaux × Bordeaux. Les autres combinaisons sont atteintes par les liens internes.
  const locales = [
    routes.metiers,
    ...tousLesMetiers().map((m) => routes.metier(m.id)),
    ...metiersPopulaires().flatMap((m) => VILLES_LOCALES.map((v) => routes.metierVille(m.id, v))),
    ...toutesLesPrestations().map((p) => routes.travauxVille(p.id, 'Bordeaux')),
  ];
  return pagesDuSitemap(new Date(), slugs, landings, locales);
}
