import { entreeMasquerEncart } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { masquerEncart } from '@ph/firebase/pro';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const masquer = action(
  {
    schema: entreeMasquerEncart,
    nom: 'masquerEncart',
    rateLimit: { cle: 'encart', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await masquerEncart(getFirestore(appAdmin()), ctx.uid!, e.cle, Date.now());
    return null;
  },
);

/** « Plus tard » sur un encart d'offre : masqué 30 jours (PAIEMENTS §4). */
export const POST = (requete: Request) => routeJson(requete, masquer);
