import { entreeSuiviDemande } from '@ph/core/schemas';
import { majSuiviDemande } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseRepondante, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const suivre = action(
  {
    schema: entreeSuiviDemande,
    nom: 'suiviDemande',
    rateLimit: { cle: 'demandes-pro', max: 300, fenetre: '1h' },
  },
  async (e, ctx) =>
    majSuiviDemande(
      servicesDemandesPro(),
      { artisanId: await entrepriseRepondante(ctx.uid!), uid: ctx.uid! },
      e,
    ),
);

/** Suivi façon CRM d'une demande acceptée : étape, note, relance. */
export const POST = (requete: Request) => routeJson(requete, suivre);
