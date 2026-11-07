import { entreeArticleEnUnClic } from '@ph/core/schemas';
import { articleEnUnClic } from '@ph/firebase/blog';
import { clientAnthropic } from '@ph/firebase/ia';
import { servicesComptes } from '@/server/espace';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';
// Plusieurs appels au modèle (rédaction, classement, réseaux) : jusqu'à quelques minutes.
export const maxDuration = 300;

/** « Tout faire en un clic » (BLOG §2 bis) : brouillon ou planifié, jamais publié directement. */
export const POST = routeSite('articleEnUnClic', entreeArticleEnUnClic, async (s, ctx, e) => {
  const cle = process.env.ANTHROPIC_API_KEY;
  return articleEnUnClic(
    { ...s, client: cle ? clientAnthropic(cle) : null, notifier: servicesComptes().notifier },
    ctx,
    { fin: e.fin, ...(e.sujet ? { sujet: e.sujet } : {}) },
  );
});
