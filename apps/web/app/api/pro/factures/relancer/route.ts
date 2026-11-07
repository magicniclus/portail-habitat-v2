import { entreeRelancerFacture } from '@ph/core/schemas';
import { relancerFacture } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const relancer = action(
  {
    schema: entreeRelancerFacture,
    nom: 'relancerFacture',
    rateLimit: { cle: 'factures-relance', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await relancerFacture(
      { ...servicesDevis(), notifier: servicesComptes().notifier },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Bouton « Relancer » : email au client avec la facture (une fois par jour au plus). */
export const POST = (requete: Request) => routeJson(requete, relancer);
