'use server';

import { entreeTacheAdmin } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { assignerTacheAdmin, traiterTacheAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

const agir = actionAdmin({ schema: entreeTacheAdmin, nom: 'adminTache' }, async (e, ctx) => {
  const r = await lireSessionAdmin();
  const permissions = r.etat === 'ok' ? r.session.permissions : [];
  const s = { db: getFirestore(appAdmin()), horloge: Date.now };
  if (e.action === 'prendre' || e.action === 'rendre')
    return assignerTacheAdmin(s, {
      acteurUid: ctx.uid!,
      permissions,
      id: e.id,
      prendre: e.action === 'prendre',
    });
  return traiterTacheAdmin(s, {
    acteurUid: ctx.uid!,
    permissions,
    id: e.id,
    issue: e.action === 'traiter' ? 'traitee' : 'rejetee',
    resolution: e.resolution ?? '',
  });
});

/** Prendre, rendre, traiter ou rejeter une tâche (la permission du type est revérifiée). */
export async function agirSurTache(
  id: string,
  action: 'prendre' | 'rendre' | 'traiter' | 'rejeter',
  resolution?: string,
): Promise<string | null> {
  const r = await agir({ id, action, ...(resolution ? { resolution } : {}) });
  revalidatePath('/admin/file');
  revalidatePath('/admin');
  return r.ok ? null : r.message;
}
