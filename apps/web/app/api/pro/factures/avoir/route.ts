import { entreeAvoir } from '@ph/core/schemas';
import { creerAvoir } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { produirePdfFacture, servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const annuler = action(
  {
    schema: entreeAvoir,
    nom: 'creerAvoir',
    rateLimit: { cle: 'factures', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'factures.emettre');
    const r = await creerAvoir(servicesDevis(), { artisanId, uid: ctx.uid! }, e);
    await produirePdfFacture(artisanId, r.factureId);
    return r;
  },
);

/** Avoir : seule correction possible d'une facture émise. */
export const POST = (requete: Request) => routeJson(requete, annuler);
