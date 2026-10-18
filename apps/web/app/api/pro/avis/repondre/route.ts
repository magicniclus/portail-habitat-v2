import { entreeReponseAvis } from '@ph/core/schemas';
import { repondreAvis } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const repondre = action(
  {
    schema: entreeReponseAvis,
    nom: 'repondreAvis',
    rateLimit: { cle: 'avis-pro', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await repondreAvis(
      servicesDemandesPro(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'avis.repondre'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Réponse publique à un avis (Mes avis). */
export const POST = (requete: Request) => routeJson(requete, repondre);
