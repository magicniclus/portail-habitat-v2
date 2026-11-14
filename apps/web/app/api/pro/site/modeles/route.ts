import { entreePublierSite } from '@ph/core/schemas';
import { lireModelesSite } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Mes modèles (dont « Avant IA – date ») : lus à l'ouverture du panneau, jamais au chargement. */
export const POST = routeSite('lireModelesSite', entreePublierSite, (s, ctx) =>
  lireModelesSite(s.db, ctx.artisanId),
);
