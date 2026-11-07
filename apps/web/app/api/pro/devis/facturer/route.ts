import { entreeFacturerDevis } from '@ph/core/schemas';
import { facturerDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { produirePdfFacture, servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const facturer = action(
  {
    schema: entreeFacturerDevis,
    nom: 'facturerDevis',
    rateLimit: { cle: 'factures', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'factures.emettre');
    const r = await facturerDevis(servicesDevis(), { artisanId, uid: ctx.uid! }, e);
    await produirePdfFacture(artisanId, r.factureId);
    return r;
  },
);

/** Facture ou facture d'acompte depuis un devis : numéro sans trou, PDF figé. */
export const POST = (requete: Request) => routeJson(requete, facturer);
