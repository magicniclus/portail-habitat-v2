import { entreeChangerEmail } from '@ph/core/schemas';
import { changerEmailPro } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const changer = action(
  {
    schema: entreeChangerEmail,
    nom: 'changerEmailPro',
    rateLimit: { cle: 'email', max: 3, fenetre: '1j' },
  },
  async (e, ctx) => changerEmailPro(servicesCompte(), ctx.uid!, e).then(() => null),
);

/** Mon compte : lien de confirmation à la nouvelle adresse, alerte à l'ancienne. */
export const POST = (requete: Request) => routeJson(requete, changer);
