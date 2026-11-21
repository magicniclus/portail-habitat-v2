import { entreeAccepterInvitation } from '@ph/core/schemas';
import { accepterInvitation } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const accepter = action(
  {
    schema: entreeAccepterInvitation,
    nom: 'accepterInvitation',
    rateLimit: { cle: 'invitation', max: 10, fenetre: '1h' },
  },
  async (e, ctx) => accepterInvitation(servicesComptes(), ctx.uid!, e),
);

/** Acceptation : même email, sièges revérifiés, jeton à usage unique (COMPTES §4.2). */
export const POST = (requete: Request) => routeJson(requete, accepter);
