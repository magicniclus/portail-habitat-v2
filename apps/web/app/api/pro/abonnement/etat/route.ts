import { FORMULES_PAYANTES } from '@ph/core/paiements';
import { z } from '@ph/core/zod';
import { lireSessionPro } from '@/server/sessionPro';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const lire = action(
  {
    schema: z.strictObject({ produit: z.enum(FORMULES_PAYANTES) }),
    nom: 'etatAbonnement',
    lectureSeule: true,
    rateLimit: { cle: 'etat-abonnement', max: 300, fenetre: '1h' },
  },
  async (e) => {
    const artisan = (await lireSessionPro())?.espace.active?.artisan;
    // `droits` n'est écrit que par le webhook : la formule est active quand il l'a confirmée.
    const actif = artisan?.formule === e.produit;
    return { actif };
  },
);

/** Retour de Checkout : la page attend que le webhook ait activé l'offre (PAY-01). */
export const POST = (requete: Request) => routeJson(requete, lire);
