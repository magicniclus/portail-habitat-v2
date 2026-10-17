import { entreeAvis } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { deposerAvis } from '@ph/firebase/avis';
import { notifier, servicesNotifications } from '@ph/firebase/notifications';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const deposer = action(
  {
    schema: entreeAvis,
    nom: 'deposerAvis',
    authentification: 'facultative',
    rateLimit: { cle: 'avis', max: 5, fenetre: '1j' },
    idempotence: true,
  },
  async (e, ctx) => {
    const db = getFirestore(appAdmin());
    return deposerAvis(
      {
        db,
        horloge: Date.now,
        notifier: (n) => notifier(servicesNotifications(db), n),
      },
      e,
      { uid: ctx.uid, ...(await traceRequete('inconnue')) },
    );
  },
);

/** Dépôt d'un avis (AVI-01 à 04) : 5 avis par jour et par client, idempotence. */
export const POST = (requete: Request) => routeJson(requete, deposer);
