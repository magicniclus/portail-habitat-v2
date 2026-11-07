import { entreeRegimeTva } from '@ph/core/schemas';
import { changerRegimeTva } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const changer = action(
  {
    schema: entreeRegimeTva,
    nom: 'regimeTva',
    rateLimit: { cle: 'devis', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await changerRegimeTva(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** « Je suis / ne suis pas soumis à la TVA », choisi sur la feuille du devis. */
export const POST = (requete: Request) => routeJson(requete, changer);
