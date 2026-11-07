import { ErreurMetier } from '@ph/core/erreurs';
import { z } from '@ph/core/zod';
import { ouvrirPortailClient } from '@ph/firebase/facturation';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { facturationBloquee, servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';
import { lireSessionPro } from '@/server/sessionPro';

export const dynamic = 'force-dynamic';

const ouvrir = action(
  {
    schema: z.strictObject({}),
    nom: 'ouvrirPortailClient',
    rateLimit: { cle: 'portail', max: 30, fenetre: '1h' },
  },
  async (_e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'abonnement.gerer');
    const session = await lireSessionPro();
    if (!session || facturationBloquee(session))
      throw new ErreurMetier('PERMISSION_REFUSEE', 'Activez la double authentification d’abord.');
    return ouvrirPortailClient(servicesCheckout(), artisanId);
  },
);

/** « Gérer mon abonnement » : portail client Stripe (carte, factures, résiliation). */
export const POST = (requete: Request) => routeJson(requete, ouvrir);
