import { entreeReponseDemande } from '@ph/core/schemas';
import { repondreDemande } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseRepondante, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const repondre = action(
  {
    schema: entreeReponseDemande,
    nom: 'repondreDemande',
    rateLimit: { cle: 'demandes-pro', max: 120, fenetre: '1h' },
  },
  async (e, ctx) =>
    repondreDemande(
      servicesDemandesPro(),
      { artisanId: await entrepriseRepondante(ctx.uid!), uid: ctx.uid! },
      e,
    ),
);

/** Ouvrir, accepter ou refuser une demande (PRO-02). */
export const POST = (requete: Request) => routeJson(requete, repondre);
