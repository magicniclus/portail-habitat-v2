import { entreeBrouillonFacture } from '@ph/core/schemas';
import { enregistrerBrouillonFacture } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeBrouillonFacture,
    nom: 'brouillonFacture',
    rateLimit: { cle: 'factures', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerBrouillonFacture(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! },
      e,
    ),
);

/** « Enregistrer le brouillon » d'une facture : sans numéro, modifiable jusqu'à l'émission. */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
