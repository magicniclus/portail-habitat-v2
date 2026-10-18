import { z } from '@ph/core/zod';
import { synchroniserComptePro } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const synchroniser = action(
  {
    schema: z.strictObject({}),
    nom: 'synchroniserComptePro',
    rateLimit: { cle: 'synchro', max: 60, fenetre: '1h' },
  },
  async (_e, ctx) => synchroniserComptePro(servicesCompte(), ctx.uid!).then(() => null),
);

/** Après un changement fait dans le navigateur (second facteur, Google) : `users/{uid}` recopié. */
export const POST = (requete: Request) => routeJson(requete, synchroniser);
