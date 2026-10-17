import { entreeDemanderAcces } from '@ph/core/schemas';
import { demanderAcces } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const demander = action(
  {
    schema: entreeDemanderAcces,
    nom: 'demanderAcces',
    rateLimit: { cle: 'rejoindre', max: 10, fenetre: '1h' },
  },
  async (e, ctx) => demanderAcces(servicesComptes(), ctx.uid!, e),
);

/** « Demander à rejoindre » une entreprise déjà inscrite (COMPTES §4.4, ONB-03). */
export const POST = (requete: Request) => routeJson(requete, demander);
