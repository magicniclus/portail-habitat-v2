import { entreeClientCarnet } from '@ph/core/schemas';
import { gererClient } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const gerer = action(
  {
    schema: entreeClientCarnet,
    nom: 'clientCarnet',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    gererClient(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** Base clients : création, modification, suppression d'une fiche. */
export const POST = (requete: Request) => routeJson(requete, gerer);
