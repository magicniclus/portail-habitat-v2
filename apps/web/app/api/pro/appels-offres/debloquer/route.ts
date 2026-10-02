import { entreeDebloquerAppelOffres } from '@ph/core/schemas';
import { creerCheckoutPaiement } from '@ph/firebase/facturation';
import { debloquerAppelOffres } from '@ph/firebase/matching';
import { action } from '@/server/action';
import { paiementAutorise } from '@/server/appelsOffres';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const debloquer = action(
  {
    schema: entreeDebloquerAppelOffres,
    nom: 'debloquerAppelOffres',
    rateLimit: { cle: 'appels-offres', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    const { email } = await paiementAutorise(e.choix === 'carte');
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'leads.debloquer');
    const demande = { appelOffresId: e.appelOffresId, artisanId, uid: ctx.uid! };
    if (e.choix === 'carte') {
      const { url } = await creerCheckoutPaiement(servicesCheckout(), {
        ...demande,
        email,
        type: 'lead',
      });
      return { etat: 'redirection' as const, url };
    }
    return debloquerAppelOffres(servicesDemandesPro(), { ...demande, choix: 'auto' });
  },
);

/** « Répondre à cet appel d'offres » : crédits, ou page de paiement Stripe (PRO-04 à 06). */
export const POST = (requete: Request) => routeJson(requete, debloquer);
