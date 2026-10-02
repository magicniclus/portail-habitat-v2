import { z } from '@ph/core/zod';
import { lireSessionPro } from '@/server/sessionPro';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const lire = action(
  {
    schema: z.strictObject({ produit: z.enum(['premium', 'visibilite']) }),
    nom: 'etatAbonnement',
    lectureSeule: true,
    rateLimit: { cle: 'etat-abonnement', max: 300, fenetre: '1h' },
  },
  async (e) => {
    const artisan = (await lireSessionPro())?.espace.active?.artisan;
    const actif =
      e.produit === 'premium' ? artisan?.plan === 'premium' : artisan?.optionVisibilite === true;
    return { actif };
  },
);

/** Retour de Checkout : la page attend que le webhook ait activé l'offre (PAY-01). */
export const POST = (requete: Request) => routeJson(requete, lire);
