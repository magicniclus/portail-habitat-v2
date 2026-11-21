import { entreePrendreDemande } from '@ph/core/schemas';
import { prendreEnCharge } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseRepondante, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const prendre = action(
  {
    schema: entreePrendreDemande,
    nom: 'prendreDemande',
    rateLimit: { cle: 'demandes-pro', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    await prendreEnCharge(
      servicesDemandesPro(),
      { artisanId: await entrepriseRepondante(ctx.uid!), uid: ctx.uid! },
      e.demandeId,
    );
    return null;
  },
);

/** « Je m'en occupe » (PRO-03). */
export const POST = (requete: Request) => routeJson(requete, prendre);
