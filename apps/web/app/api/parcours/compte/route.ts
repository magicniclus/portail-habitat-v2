import { entreeBrouillonCompte } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { brouillonCompte } from '@ph/firebase/parcours';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const executer = action(
  {
    schema: entreeBrouillonCompte,
    nom: 'brouillonCompte',
    // Écriture à chaque changement d'étape seulement (REPRISE_PARCOURS §5).
    rateLimit: { cle: 'brouillon-compte', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    brouillonCompte({ db: getFirestore(appAdmin()), horloge: Date.now }, ctx.uid!, e),
);

/** Brouillon d'une personne connectée : lu à l'arrivée, enregistré à chaque étape, effacé. */
export const POST = (requete: Request) => routeJson(requete, executer);
