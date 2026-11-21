import { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { exporterMesDonnees } from '@ph/firebase/espace';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const exporter = action(
  {
    schema: z.strictObject({}),
    nom: 'exporterMesDonnees',
    lectureSeule: true,
    rateLimit: { cle: 'export', max: 5, fenetre: '1j' },
  },
  async (_e, ctx) => exporterMesDonnees(getFirestore(appAdmin()), ctx.uid!),
);

/** Export de mes données (ESP-04) : fichier JSON enregistré par le navigateur. */
export const POST = (requete: Request) => routeJson(requete, exporter);
