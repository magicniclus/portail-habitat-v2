'use server';

import { entreeSourceAdmin } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { activerSourceAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

const activer = actionAdmin(
  { schema: entreeSourceAdmin, nom: 'adminActiverSource', permission: 'matching.config' },
  async (e, ctx) =>
    activerSourceAdmin(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { acteurUid: ctx.uid!, ...e },
    ),
);

/** Couper ou rouvrir une source partenaire (le webhook refuse alors ses envois). */
export async function activerSource(
  sourceId: string,
  actif: boolean,
  motif: string,
): Promise<string | null> {
  const r = await activer({ sourceId, actif, motif });
  revalidatePath('/admin/demandes/sources');
  return r.ok ? null : r.message;
}
