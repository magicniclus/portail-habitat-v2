import { entreeStatutDevis } from '@ph/core/schemas';
import { changerStatutDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const changer = action(
  {
    schema: entreeStatutDevis,
    nom: 'changerStatutDevis',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) => {
    await changerStatutDevis(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Accepté, refusé ou archivé. */
export const POST = (requete: Request) => routeJson(requete, changer);
