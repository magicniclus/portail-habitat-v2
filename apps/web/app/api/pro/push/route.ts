import { decrireAppareil } from '@ph/core/espace-pro';
import { entreePush } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { enregistrerAppareilPush, retirerAppareilPush } from '@ph/firebase/notifications';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const push = action(
  { schema: entreePush, nom: 'appareilPush', rateLimit: { cle: 'push', max: 30, fenetre: '1h' } },
  async (e, ctx) => {
    const db = getFirestore(appAdmin());
    if (!e.actif) await retirerAppareilPush(db, ctx.uid!, e.jeton);
    else {
      const { userAgent } = await traceRequete();
      await enregistrerAppareilPush(
        db,
        ctx.uid!,
        e.jeton,
        decrireAppareil(userAgent ?? ''),
        Date.now(),
      );
    }
    return null;
  },
);

/** Notifications push de l'application pro : cet appareil abonné ou désabonné (MOB-06). */
export const POST = (requete: Request) => routeJson(requete, push);
