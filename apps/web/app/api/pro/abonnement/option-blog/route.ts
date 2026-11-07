import { entreeOptionBlog } from '@ph/core/schemas';
import { changerOptionBlog } from '@ph/firebase/facturation';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const changer = action(
  {
    schema: entreeOptionBlog,
    nom: 'changerOptionBlog',
    rateLimit: { cle: 'checkout', max: 20, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'abonnement.gerer');
    await changerOptionBlog(servicesCheckout(), { artisanId, activer: e.activer });
    return null;
  },
);

/** Option Blog (D71) : ajoutée à l'abonnement en cours ou retirée ; `droits` suit par le webhook. */
export const POST = (requete: Request) => routeJson(requete, changer);
