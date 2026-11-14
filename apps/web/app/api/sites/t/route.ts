import { estRobot } from '@ph/core/comportement';
import { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { compterVueArticle } from '@ph/firebase/blog';
import { compterVueSite, pageDuChemin } from '@ph/firebase/sites';
import { getFirestore } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { hoteSite } from '@/lib/hotesSites';
import { actionMesure } from '@/server/action';
import { firestoreConfigure } from '@/server/lecture';
import { routeJson } from '@/server/json';
import { siteServi } from '@/server/sitesPublics';

export const dynamic = 'force-dynamic';

const plateforme = () =>
  new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portailtravaux.fr').hostname;

const compter = actionMesure(
  {
    schema: z.strictObject({ p: z.string().max(300) }),
    nom: 'compterVueSite',
    rateLimit: { cle: 'site-vue', max: 300, fenetre: '1h' },
  },
  async (e) => {
    const hote = hoteSite((await headers()).get('host'), plateforme());
    const site = hote ? await siteServi(hote) : null;
    const page = site && pageDuChemin(site, e.p);
    // Page inconnue : rien n'est compté (aucune clé libre dans les compteurs).
    if (site && page)
      await compterVueSite(getFirestore(appAdmin()), site.siteId, page.id, Date.now());
    // Article du blog : vues de l'article (onglet Blog, BLOG §5).
    const article = site && !page ? /^\/blog\/([a-z0-9-]{1,80})$/.exec(e.p) : null;
    if (site && article)
      await compterVueArticle(getFirestore(appAdmin()), site.siteId, article[1]!);
    return null;
  },
);

/**
 * Page vue sur un site artisan (SITE_INTERNET §2) : mesure maison sans cookie, sans IP ni
 * identifiant de visiteur, agrégée par jour et par mois ; robots écartés, même origine.
 */
export async function POST(requete: Request) {
  if (estRobot(requete.headers.get('user-agent')) || !firestoreConfigure())
    return new Response(null, { status: 204 });
  const r = await routeJson(requete, compter, 512);
  return r.status === 200 ? new Response(null, { status: 204 }) : r;
}
