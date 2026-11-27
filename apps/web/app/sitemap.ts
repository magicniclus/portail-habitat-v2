import type { MetadataRoute } from 'next';
import { GUIDES_PLAN } from '@/features/planMaison/contenu';
import { pagesDuSitemap } from '@/features/vitrine/indexation';
import { LANDINGS } from '@ph/core/landings';
import { lireSlugs } from '@/server/annuaire';
import { routes } from '@/lib/routes';
import { flagActif } from '@/server/flags';
import { pagesSecteurSitemap } from '@/server/pagesSecteur';
import { tousLesMetiers, toutesLesPrestations } from '@/server/seoLocal';

// Régénéré toutes les heures : les nouvelles fiches en ligne y apparaissent sans redéploiement.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, site, devis, dessin, dessinPublic, secteurs] = await Promise.all([
    lireSlugs(),
    flagActif('landingSite'),
    flagActif('landingDevis'),
    flagActif('dessin'),
    flagActif('dessinPublic'),
    pagesSecteurSitemap(),
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
  // Référencement local : index, métiers, pages de secteur indexées du registre (métier × commune
  // avec au moins un artisan, créées à l'arrivée des artisans), travaux × Bordeaux.
  const locales = [
    routes.metiers,
    ...tousLesMetiers().map((m) => routes.metier(m.id)),
    ...secteurs.map((p) => routes.metierVille(p.metier, p.commune.slug)),
    ...toutesLesPrestations().map((p) => routes.travauxVille(p.id, 'Bordeaux')),
  ];
  return pagesDuSitemap(new Date(), slugs, landings, locales);
}
