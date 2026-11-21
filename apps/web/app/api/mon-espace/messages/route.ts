import { entreeMessageParticulier } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { envoyerMessageParticulier } from '@ph/firebase/espace';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const envoyer = action(
  {
    schema: entreeMessageParticulier,
    nom: 'envoyerMessageParticulier',
    rateLimit: { cle: 'message', max: 60, fenetre: '1h' },
    idempotence: true,
  },
  async (e, ctx) =>
    envoyerMessageParticulier({ db: getFirestore(appAdmin()), horloge: Date.now }, ctx.uid!, e),
);

/** Message à un artisan de la demande (ESP-03) : coordonnées masquées avant acceptation. */
export const POST = (requete: Request) => routeJson(requete, envoyer);
