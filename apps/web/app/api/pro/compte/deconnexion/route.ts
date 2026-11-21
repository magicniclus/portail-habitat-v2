import { z } from '@ph/core/zod';
import { deconnecterPartout } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';
import { fermerSession } from '@/server/sessionCookies';

export const dynamic = 'force-dynamic';

const deconnecter = action(
  {
    schema: z.strictObject({}),
    nom: 'deconnecterPartout',
    rateLimit: { cle: 'deconnexion', max: 10, fenetre: '1h' },
  },
  async (_e, ctx) => {
    await deconnecterPartout(servicesCompte(), ctx.uid!);
    await fermerSession();
    return null;
  },
);

/** « Déconnecter tous les appareils » : jetons révoqués partout, y compris ici. */
export const POST = (requete: Request) => routeJson(requete, deconnecter);
