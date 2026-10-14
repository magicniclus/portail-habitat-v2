import { ErreurMetier } from '@ph/core/erreurs';
import { entreeFormulaireSite } from '@ph/core/schemas';
import { envoyerFormulaireSite } from '@ph/firebase/sites';
import { headers } from 'next/headers';
import { hoteSite } from '@/lib/hotesSites';
import { actionMesure } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';
import { siteServi, verifierTurnstile } from '@/server/sitesPublics';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const plateforme = () =>
  new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portailhabitat.fr').hostname;

const envoyer = actionMesure(
  {
    schema: entreeFormulaireSite,
    nom: 'envoyerFormulaireSite',
    rateLimit: { cle: 'formulaireSite', max: 5, fenetre: '1h' },
  },
  async (e) => {
    const h = await headers();
    const hote = hoteSite(h.get('host'), plateforme());
    const site = hote ? await siteServi(hote) : null;
    if (!site) throw new ErreurMetier('INTROUVABLE');
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    const r = await envoyerFormulaireSite(servicesCompte(), {
      siteId: site.siteId,
      valeurs: e.valeurs,
      turnstileOk: await verifierTurnstile(e.jeton, ip),
      page: e.page,
      trace: await traceRequete(),
    });
    return { reference: r.reference };
  },
);

/**
 * Formulaire de contact d'un site artisan, sur le domaine du site (même origine) : anti-robot
 * vérifié avant tout (SITE-12), demande attribuée directement à l'artisan (SITE-03).
 */
export function POST(requete: Request) {
  return routeJson(requete, envoyer, 32 * 1024);
}
