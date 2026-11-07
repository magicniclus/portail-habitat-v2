import { entreePageSite } from '@ph/core/schemas';
import { enregistrerPage } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Brouillon d'une page (900 Ko au plus) ; publié seulement par « Publier ». */
export const POST = routeSite(
  'enregistrerPageSite',
  entreePageSite,
  async (s, ctx, e) => {
    await enregistrerPage(s, ctx, e);
    return null;
  },
  1024 * 1024,
);
