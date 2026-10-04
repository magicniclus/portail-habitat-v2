'use server';

import { entreeModererAvis } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { modererAvisAdmin, supprimerAvisAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';

const services = () => ({
  db: getFirestore(appAdmin()),
  horloge: Date.now,
  notifier: servicesComptes().notifier,
});

const moderer = actionAdmin(
  { schema: entreeModererAvis, nom: 'adminModererAvis', permission: 'avis.moderer' },
  async (e, ctx) => {
    if (e.action === 'supprimer') throw new Error('action inattendue');
    return modererAvisAdmin(services(), {
      acteurUid: ctx.uid!,
      avisId: e.avisId,
      action: e.action,
      motif: e.motif,
      ...(e.motifRefus ? { motifRefus: e.motifRefus } : {}),
    });
  },
);
const supprimer = actionAdmin(
  { schema: entreeModererAvis, nom: 'adminSupprimerAvis', permission: 'avis.supprimer' },
  async (e, ctx) =>
    supprimerAvisAdmin(services(), { acteurUid: ctx.uid!, avisId: e.avisId, motif: e.motif }),
);

/** Publier, refuser (motif prédéfini), demander une preuve, suspendre ou supprimer un avis. */
export async function decisionAvis(e: z.input<typeof entreeModererAvis>): Promise<string | null> {
  const r = await (e.action === 'supprimer' ? supprimer : moderer)(e);
  revalidatePath('/admin/avis');
  return r.ok ? null : r.message;
}
