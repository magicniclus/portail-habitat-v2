import { ErreurMetier } from '@ph/core/erreurs';
import { entreeReprise } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { reprendreParLien } from '@ph/firebase/parcours';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const reprendre = action(
  {
    schema: entreeReprise,
    nom: 'reprendreParLien',
    authentification: 'facultative',
    rateLimit: { cle: 'reprise', max: 20, fenetre: '1h' },
  },
  async (e) => {
    const b = await reprendreParLien({ db: getFirestore(appAdmin()), horloge: Date.now }, e.jeton);
    if (!b)
      throw new ErreurMetier(
        'INTROUVABLE',
        'Ce lien a expiré, votre estimation n’a pas pu être retrouvée.',
      );
    return b;
  },
);

/** Ouverture de `/simulateur?reprise=<jeton>` : usage unique, 30 jours. */
export const POST = (requete: Request) => routeJson(requete, reprendre);
