import { entreeAvis } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { deposerAvis } from '@ph/firebase/avis';
import { notifier, planifierCloudTask } from '@ph/firebase/notifications';
import { getFirestore } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

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
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
    const db = getFirestore(appAdmin());
    return deposerAvis(
      {
        db,
        horloge: Date.now,
        notifier: (n) => notifier({ db, horloge: Date.now, planifier: planifierCloudTask }, n),
      },
      e,
      {
        uid: ctx.uid,
        ipHash: createHash('sha256').update(ip).digest('hex').slice(0, 32),
        userAgent: h.get('user-agent') ?? undefined,
      },
    );
  },
);

/** Dépôt d'un avis (AVI-01 à 04) : 5 avis par jour et par client, idempotence. */
export const POST = (requete: Request) => routeJson(requete, deposer);
