import { entreeProfilPro } from '@ph/core/schemas';
import { modifierProfilPro } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const modifier = action(
  {
    schema: entreeProfilPro,
    nom: 'modifierProfilPro',
    rateLimit: { cle: 'profil', max: 30, fenetre: '1h' },
  },
  async (e, ctx) => modifierProfilPro(servicesCompte(), ctx.uid!, e).then(() => null),
);

/** Mon compte : prénom, nom et téléphone. */
export const POST = (requete: Request) => routeJson(requete, modifier);
