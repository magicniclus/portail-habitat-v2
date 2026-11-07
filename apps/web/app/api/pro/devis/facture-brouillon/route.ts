import { entreeDevisCible } from '@ph/core/schemas';
import { preparerFactureDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const preparer = action(
  {
    schema: entreeDevisCible,
    nom: 'preparerFactureDevis',
    rateLimit: { cle: 'factures', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'factures.emettre');
    return preparerFactureDevis(servicesDevis(), { artisanId, uid: ctx.uid! }, e);
  },
);

/** « Transformer en facture » : brouillon pré-rempli depuis le devis, à relire puis émettre. */
export const POST = (requete: Request) => routeJson(requete, preparer);
