import { entreePaiementFacture } from '@ph/core/schemas';
import { enregistrerPaiement } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const payer = action(
  {
    schema: entreePaiementFacture,
    nom: 'enregistrerPaiement',
    rateLimit: { cle: 'factures', max: 120, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerPaiement(
      servicesDevis(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! },
      e,
    ),
);

/** Paiement reçu (partiel ou complet). */
export const POST = (requete: Request) => routeJson(requete, payer);
