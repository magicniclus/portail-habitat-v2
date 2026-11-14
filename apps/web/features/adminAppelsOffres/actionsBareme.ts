'use server';

import { baremeDepuisSaisie, type SimulationBareme } from '@ph/core/admin';
import { entreeBaremeAdmin, entreePublierBaremeAdmin } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { publierBaremeAdmin, simulerBaremeAdmin } from '@ph/firebase/admin-serveur';
import { lireBaremeActif } from '@ph/firebase/matching';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

const db = () => getFirestore(appAdmin());
const versBareme = async (saisie: z.output<typeof entreeBaremeAdmin>) =>
  baremeDepuisSaisie(saisie, (await lireBaremeActif(db())).bareme);

const simuler = actionAdmin(
  { schema: entreeBaremeAdmin, nom: 'adminSimulerBareme', permission: 'leads.prix' },
  async (e) => simulerBaremeAdmin(db(), await versBareme(e), Date.now()),
);
const publier = actionAdmin(
  { schema: entreePublierBaremeAdmin, nom: 'adminMajBareme', permission: 'leads.prix_illimite' },
  async (e, ctx) =>
    publierBaremeAdmin(
      { db: db(), horloge: Date.now },
      { acteurUid: ctx.uid!, bareme: await versBareme(e.bareme), motif: e.motif },
    ),
);

/** ADM-05 : effet du barème saisi sur les 50 derniers leads, sans rien publier. */
export async function simulerBareme(
  saisie: z.input<typeof entreeBaremeAdmin>,
): Promise<{ simulation: SimulationBareme } | { erreur: string }> {
  const r = await simuler(saisie);
  return r.ok ? { simulation: r.data } : { erreur: r.message };
}

/** Nouvelle version active du barème (motif obligatoire) ; seuls les nouveaux leads sont concernés. */
export async function publierBareme(
  saisie: z.input<typeof entreeBaremeAdmin>,
  motif: string,
): Promise<string | null> {
  const r = await publier({ bareme: saisie, motif });
  revalidatePath('/admin/appels-d-offres/baremes');
  return r.ok ? null : r.message;
}
