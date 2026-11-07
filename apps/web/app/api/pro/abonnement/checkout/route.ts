import { entreeCheckout } from '@ph/core/schemas';
import { changerFormule } from '@ph/firebase/facturation';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';
import { lireSessionPro } from '@/server/sessionPro';

export const dynamic = 'force-dynamic';

const payer = action(
  {
    schema: entreeCheckout,
    nom: 'changerFormule',
    rateLimit: { cle: 'checkout', max: 20, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'abonnement.gerer');
    const email = (await lireSessionPro())?.email ?? '';
    return changerFormule(servicesCheckout(), { artisanId, email, ...e });
  },
);

/** Changement de formule : URL de Stripe Checkout, ou changement appliqué par Stripe (PAY-02 à 04). */
export const POST = (requete: Request) => routeJson(requete, payer);
