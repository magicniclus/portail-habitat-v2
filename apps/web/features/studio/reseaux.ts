'use server';

import { entreeConnexionReseauStudio, entreeReseauStudio } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { configReseaux, connecterReseauStudio, deconnecterReseauStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

/** Comptes des réseaux du Studio (STUDIO.md §10) : connexion et déconnexion, journalisées. */
const P = 'studio.utiliser' as const;

const connexion = actionAdmin(
  { schema: entreeConnexionReseauStudio, nom: 'adminStudioConnecterReseau', permission: P },
  async (e, ctx) => {
    const c = configReseaux(process.env);
    if (!c) throw new Error('STUDIO_CHIFFREMENT_CLE manquante.');
    return connecterReseauStudio(getFirestore(appAdmin()), c, { ...e, auteurUid: ctx.uid! });
  },
);
export const connecterReseau = async (e: z.input<typeof entreeConnexionReseauStudio>) =>
  connexion(e);

const deconnexion = actionAdmin(
  { schema: entreeReseauStudio, nom: 'adminStudioDeconnecterReseau', permission: P },
  async (e) => deconnecterReseauStudio(getFirestore(appAdmin()), e.reseau),
);
export const deconnecterReseau = async (e: z.input<typeof entreeReseauStudio>) => {
  const r = await deconnexion(e);
  revalidatePath('/admin/studio/reseaux');
  return r.ok ? { ok: true as const } : { ok: false as const, message: r.message };
};
