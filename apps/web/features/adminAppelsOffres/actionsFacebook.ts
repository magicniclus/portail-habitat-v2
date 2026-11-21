'use server';

import { entreePublicationFacebook } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { marquerPublicationFacebook } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

const marquer = actionAdmin(
  {
    schema: entreePublicationFacebook,
    nom: 'adminPublicationFacebook',
    permission: 'leads.publier',
  },
  async (e, ctx) =>
    marquerPublicationFacebook(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { acteurUid: ctx.uid!, departement: e.departement },
    ),
);

/** Publication du jour collée dans le groupe : trace d'audit. */
export async function marquerPublication(departement: string): Promise<string | null> {
  const r = await marquer({ departement });
  revalidatePath('/admin/appels-d-offres/facebook');
  return r.ok ? null : r.message;
}
