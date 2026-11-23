import type { MetadataRoute } from 'next';
import { GUIDES_PLAN } from '@/features/planMaison/contenu';
import { pagesDuSitemap } from '@/features/vitrine/indexation';
import { LANDINGS } from '@ph/core/landings';
import { lireSlugs } from '@/server/annuaire';
import { routes } from '@/lib/routes';
import { flagActif } from '@/server/flags';
import { metiersPopulaires } from '@/server/metiers';
import { tousLesMetiers, toutesLesPrestations, VILLES_LOCALES } from '@/server/seoLocal';

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
    // Landing « plan de maison gratuit » et ses guides : seulement quand Plans et sa page publique
    // sont ouverts. /dessin n'y figure plus : sa page canonique est la landing.
    ...(dessin && dessinPublic
      ? [routes.planMaison as string, ...GUIDES_PLAN.map((g) => routes.planMaisonGuide(g.slug))]
      : []),
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
