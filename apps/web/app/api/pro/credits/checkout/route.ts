import { entreeAchatPack } from '@ph/core/schemas';
import { creerCheckoutPaiement } from '@ph/firebase/facturation';
import { action } from '@/server/action';
import { paiementAutorise } from '@/server/appelsOffres';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const acheter = action(
  {
    schema: entreeAchatPack,
    nom: 'acheterPackCredits',
    rateLimit: { cle: 'checkout', max: 20, fenetre: '1h' },
  },
  async (e, ctx) => {
    const { email } = await paiementAutorise(true);
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'abonnement.gerer');
    return creerCheckoutPaiement(servicesCheckout(), {
      artisanId,
      email,
      type: 'pack',
      cle: e.cle,
    });
  },
);

/** Achat d'un pack de crédits : URL de la page Stripe Checkout (PRO-05). */
export const POST = (requete: Request) => routeJson(requete, acheter);
