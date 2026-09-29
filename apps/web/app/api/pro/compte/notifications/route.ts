import { entreeNotifsPro } from '@ph/core/schemas';
import { modifierNotifsPro } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';
import { lireSessionPro } from '@/server/sessionPro';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const modifier = action(
  {
    schema: entreeNotifsPro,
    nom: 'modifierNotifsPro',
    rateLimit: { cle: 'notifs', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = (await lireSessionPro())?.artisanId ?? null;
    await modifierNotifsPro(servicesCompte(), ctx.uid!, artisanId, e, await traceRequete());
    return null;
  },
);

/** Mon compte : notifications personnelles et celles de l'entreprise active. */
export const POST = (requete: Request) => routeJson(requete, modifier);
