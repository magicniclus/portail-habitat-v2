import { entreeSuppressionCompte } from '@ph/core/schemas';
import { supprimerCompteParticulier } from '@ph/firebase/espace';
import { COOKIE_SESSION } from '@ph/firebase/serveur';
import { cookies } from 'next/headers';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const supprimer = action(
  {
    schema: entreeSuppressionCompte,
    nom: 'supprimerCompteParticulier',
    rateLimit: { cle: 'suppression', max: 3, fenetre: '1j' },
  },
  async (_e, ctx) => {
    await supprimerCompteParticulier(servicesComptes(), ctx.uid!);
    (await cookies()).delete(COOKIE_SESSION);
    return null;
  },
);

/** Suppression du compte (ESP-04), second temps de la confirmation. */
export const POST = (requete: Request) => routeJson(requete, supprimer);
