'use server';

import { entreeDecisionLitige, entreeMessageLitige } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { deciderLitigeAdmin, ecrireLitigeAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';

const services = () => ({
  db: getFirestore(appAdmin()),
  horloge: Date.now,
  notifier: servicesComptes().notifier,
});

const ecrire = actionAdmin(
  { schema: entreeMessageLitige, nom: 'adminMessageLitige', permission: 'litiges.traiter' },
  async (e, ctx) => ecrireLitigeAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const decider = actionAdmin(
  { schema: entreeDecisionLitige, nom: 'adminDeciderLitige', permission: 'litiges.traiter' },
  async (e, ctx) =>
    deciderLitigeAdmin(services(), {
      acteurUid: ctx.uid!,
      id: e.id,
      issue: e.issue,
      motif: e.motif,
      ...(e.sanction ? { sanction: e.sanction } : {}),
    }),
);

/** Message du médiateur, envoyé aux deux parties. */
export async function envoyerMessageLitige(id: string, texte: string): Promise<string | null> {
  const r = await ecrire({ id, texte });
  revalidatePath('/admin/litiges');
  return r.ok ? null : r.message;
}

/** Clôture du litige, avec un rappel ou un avertissement éventuel à l'artisan. */
export async function deciderLitige(
  e: z.input<typeof entreeDecisionLitige>,
): Promise<string | null> {
  const r = await decider(e);
  revalidatePath('/admin/litiges');
  return r.ok ? null : r.message;
}
