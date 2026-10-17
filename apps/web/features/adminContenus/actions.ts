'use server';

import { minuitParis } from '@ph/core/admin';
import { entreeAnnonce, entreeArreterAnnonce } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { arreterAnnonceAdmin, publierAnnonceAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });
// Dates saisies au jour près, à l'heure de Paris : du début du premier jour à la fin du dernier.
const jour = (d: string, fin = false) => minuitParis(d) + (fin ? 86_400_000 - 1 : 0);

const publier = actionAdmin(
  { schema: entreeAnnonce, nom: 'adminPublierAnnonce', permission: 'annonces.gerer' },
  async (e, ctx) =>
    publierAnnonceAdmin(services(), {
      acteurUid: ctx.uid!,
      titre: e.titre,
      texte: e.texte,
      cible: e.cible,
      ton: e.ton,
      debut: jour(e.debut),
      ...(e.fin ? { fin: jour(e.fin, true) } : {}),
    }),
);
const arreter = actionAdmin(
  { schema: entreeArreterAnnonce, nom: 'adminArreterAnnonce', permission: 'annonces.gerer' },
  async (e, ctx) => arreterAnnonceAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);

export async function publierAnnonce(e: z.input<typeof entreeAnnonce>): Promise<string | null> {
  const r = await publier(e);
  revalidatePath('/admin/contenus');
  return r.ok ? null : r.message;
}
export async function arreterAnnonce(id: string, motif: string): Promise<string | null> {
  const r = await arreter({ id, motif });
  revalidatePath('/admin/contenus');
  return r.ok ? null : r.message;
}
