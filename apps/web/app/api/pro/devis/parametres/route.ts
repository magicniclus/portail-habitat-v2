import { entreeParametresFacturation } from '@ph/core/schemas';
import { enregistrerParametresFacturation } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeParametresFacturation,
    nom: 'parametresFacturation',
    rateLimit: { cle: 'devis', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await enregistrerParametresFacturation(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Paramètres de facturation (identité, décennale, médiateur, conditions). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
