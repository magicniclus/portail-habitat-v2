import { entreeCreerFacture } from '@ph/core/schemas';
import { creerFacture } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { produirePdfFacture, servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const creer = action(
  {
    schema: entreeCreerFacture,
    nom: 'creerFacture',
    rateLimit: { cle: 'factures', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'factures.emettre');
    const r = await creerFacture(servicesDevis(), { artisanId, uid: ctx.uid! }, e);
    await produirePdfFacture(artisanId, r.factureId);
    return r;
  },
);

/** « Nouvelle facture » sans devis (éditeur A4) : émise d'un coup, numéro sans trou, PDF figé. */
export const POST = (requete: Request) => routeJson(requete, creer);
