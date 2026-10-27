import { entreeDevisCible } from '@ph/core/schemas';
import { envoyerDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { produirePdfDevis, servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const valider = action(
  {
    schema: entreeDevisCible,
    nom: 'validerDevis',
    rateLimit: { cle: 'devis-envoi', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await envoyerDevis(
      { ...servicesDevis(), apresEnvoi: produirePdfDevis },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e.devisId,
      'valider',
    );
    return null;
  },
);

/** « Valider » (DEV-01, DEV-02) : mentions revérifiées, devis figé, PDF stocké ; aucun email. */
export const POST = (requete: Request) => routeJson(requete, valider);
