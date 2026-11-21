import { entreeModeleDevis } from '@ph/core/schemas';
import { gererModele } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const gerer = action(
  {
    schema: entreeModeleDevis,
    nom: 'gererModele',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    gererModele(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** Modèle de devis : depuis un devis, ou suppression. */
export const POST = (requete: Request) => routeJson(requete, gerer);
