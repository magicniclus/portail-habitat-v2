import { entreeCheckout } from '@ph/core/schemas';
import { creerCheckoutAbonnement } from '@ph/firebase/facturation';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';
import { lireSessionPro } from '@/server/sessionPro';

export const dynamic = 'force-dynamic';

const payer = action(
  {
    schema: entreeCheckout,
    nom: 'creerCheckoutAbonnement',
    rateLimit: { cle: 'checkout', max: 20, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'abonnement.gerer');
    const email = (await lireSessionPro())?.email ?? '';
    return creerCheckoutAbonnement(servicesCheckout(), { artisanId, email, ...e });
  },
);

/** Paiement d'un abonnement : URL de la page Stripe Checkout (PAY-01). */
export const POST = (requete: Request) => routeJson(requete, payer);
