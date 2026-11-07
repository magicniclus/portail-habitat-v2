import { entreeArticle } from '@ph/core/schemas';
import { enregistrerArticle } from '@ph/firebase/blog';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Enregistrer un article (BLOG §3) : assaini, adresse et contrôle SEO recalculés côté serveur. */
export const POST = routeSite(
  'enregistrerArticle',
  entreeArticle,
  (s, ctx, e) => {
    const { articleId, slug, auteurUid, genereParIA, ...reste } = e;
    return enregistrerArticle(s, ctx, {
      ...reste,
      ...(articleId ? { articleId } : {}),
      ...(slug ? { slug } : {}),
      ...(auteurUid ? { auteurUid } : {}),
      ...(genereParIA ? { genereParIA } : {}),
    });
  },
  400 * 1024,
);
