import { entreeVersionSite } from '@ph/core/schemas';
import { lireVersion } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Contenu d'une version publiée, pour la reprendre dans le brouillon (historique de l'éditeur). */
export const POST = routeSite('lireVersionSite', entreeVersionSite, (s, ctx, e) =>
  lireVersion(s, ctx, e.version),
);
