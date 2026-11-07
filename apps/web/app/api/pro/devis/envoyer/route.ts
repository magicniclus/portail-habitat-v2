import { entreeDevisCible } from '@ph/core/schemas';
import { envoyerDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { produireEtEnvoyerDevis, servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const envoyer = action(
  {
    schema: entreeDevisCible,
    nom: 'envoyerDevis',
    rateLimit: { cle: 'devis-envoi', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await envoyerDevis(
      { ...servicesDevis(), apresEnvoi: produireEtEnvoyerDevis },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! },
      e.devisId,
    );
    return null;
  },
);

/** Envoi au client (DEV-01, DEV-02) : mentions revérifiées, PDF stocké, email avec lien. */
export const POST = (requete: Request) => routeJson(requete, envoyer);
