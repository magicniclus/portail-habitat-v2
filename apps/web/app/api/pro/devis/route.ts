import { entreeEnregistrerDevis } from '@ph/core/schemas';
import { enregistrerDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeEnregistrerDevis,
    nom: 'enregistrerDevis',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerDevis(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** Enregistrement d'un devis en brouillon ; totaux et mentions recalculés côté serveur. */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
