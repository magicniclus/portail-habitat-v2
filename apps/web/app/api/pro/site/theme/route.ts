import { entreeThemeSite } from '@ph/core/schemas';
import { enregistrerTheme } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Couleurs, polices et boutons du site. */
export const POST = routeSite('enregistrerThemeSite', entreeThemeSite, async (s, ctx, e) => {
  await enregistrerTheme(s, ctx, e.theme);
  return null;
});
