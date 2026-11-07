import { entreeExpirerDevis } from '@ph/core/schemas';
import { marquerDevisExpires } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const expirer = action(
  {
    schema: entreeExpirerDevis,
    nom: 'marquerDevisExpires',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    marquerDevisExpires(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** « Marquer expirés » : devis envoyés de la sélection. */
export const POST = (requete: Request) => routeJson(requete, expirer);
