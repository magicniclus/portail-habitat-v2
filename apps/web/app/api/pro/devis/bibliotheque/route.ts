import { entreePrestationBiblio } from '@ph/core/schemas';
import { gererPrestation } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const gerer = action(
  {
    schema: entreePrestationBiblio,
    nom: 'gererPrestation',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    gererPrestation(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** Bibliothèque de prestations : ajout ou suppression. */
export const POST = (requete: Request) => routeJson(requete, gerer);
