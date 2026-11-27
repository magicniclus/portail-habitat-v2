'use server';

import { entreeTexteCommuneAdmin } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { modifierTexteCommuneAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { routes } from '@/lib/routes';
import { actionAdmin } from '@/server/actionAdmin';

const enregistrer = actionAdmin(
  { schema: entreeTexteCommuneAdmin, nom: 'adminTexteCommune', permission: 'communes.modifier' },
  async (e, ctx) =>
    modifierTexteCommuneAdmin(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { acteurUid: ctx.uid!, ...e },
    ),
);

/** Nouvelle version des textes d'une commune ; la page publique est régénérée aussitôt. */
export async function enregistrerTexteCommune(
  e: z.input<typeof entreeTexteCommuneAdmin>,
): Promise<{ ok: boolean; message: string }> {
  const r = await enregistrer(e);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(routes.diagnosticCommune(e.slug) as Route);
  revalidatePath('/admin/referentiels');
  return { ok: true, message: `Version ${r.data} publiée.` };
}
