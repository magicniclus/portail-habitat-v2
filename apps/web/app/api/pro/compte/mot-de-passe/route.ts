import { decrireAppareil } from '@ph/core/espace-pro';
import { z } from '@ph/core/zod';
import { alerterMotDePasseModifie } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const alerter = action(
  {
    schema: z.strictObject({}),
    nom: 'alerterMotDePasseModifie',
    rateLimit: { cle: 'mdp', max: 5, fenetre: '1h' },
  },
  async (_e, ctx) => {
    const { userAgent } = await traceRequete();
    await alerterMotDePasseModifie(servicesCompte(), ctx.uid!, decrireAppareil(userAgent ?? ''));
    return null;
  },
);

/** Mot de passe changé dans le navigateur : email de sécurité « C'était vous ? ». */
export const POST = (requete: Request) => routeJson(requete, alerter);
