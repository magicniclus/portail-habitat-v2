import { entreeActionArticles } from '@ph/core/schemas';
import { agirSurArticles } from '@ph/firebase/blog';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Publier, planifier, archiver, brouillon, corbeille, restaurer (un ou plusieurs articles). */
export const POST = routeSite('agirSurArticles', entreeActionArticles, (s, ctx, e) =>
  agirSurArticles(s, ctx, {
    ids: e.ids,
    action: e.action,
    ...(e.date ? { date: Date.parse(e.date) } : {}),
  }),
);
