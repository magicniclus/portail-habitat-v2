'use server';

import { entreeLectureReplay, entreeStatutAlerte } from '@ph/core/schemas';
import { appAdmin, bucketReplays } from '@ph/firebase/admin';
import { changerStatutAlerte, lireReplay, type ReplayLu } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

/** Back-office › Comportement (COMPORTEMENT §6) : lecture journalisée des replays, suivi des alertes. */
const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });

const lire = actionAdmin(
  { schema: entreeLectureReplay, nom: 'adminLectureReplay', permission: 'comportement.replays' },
  async (e, ctx) =>
    lireReplay(
      {
        ...services(),
        telecharger: async (chemin) => (await bucketReplays().file(chemin).download())[0],
      },
      { acteurUid: ctx.uid!, vueId: e.vueId },
    ),
);

export async function lireReplayAdmin(vueId: string): Promise<ReplayLu | string> {
  const r = await lire({ vueId });
  return r.ok ? r.data : r.message;
}

const statut = actionAdmin(
  {
    schema: entreeStatutAlerte,
    nom: 'adminStatutAlerteComportement',
    permission: 'comportement.configurer',
  },
  async (e, ctx) => changerStatutAlerte(services(), { acteurUid: ctx.uid!, ...e }),
);

export async function changerStatutAlerteAdmin(
  alerteId: string,
  s: 'ouverte' | 'traitee' | 'ignoree',
): Promise<string | null> {
  const r = await statut({ alerteId, statut: s });
  revalidatePath('/admin/comportement');
  return r.ok ? null : r.message;
}
