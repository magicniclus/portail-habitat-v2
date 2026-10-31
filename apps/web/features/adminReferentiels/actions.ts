'use server';

import { entreeActiverPrestation, entreeFlagAdmin, entreePrixPrestation } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  activerPrestationAdmin,
  changerFlagAdmin,
  modifierPrixPrestationAdmin,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });
const permission = 'referentiels.modifier' as const;

const prix = actionAdmin(
  { schema: entreePrixPrestation, nom: 'adminMajReferentiel', permission },
  async (e, ctx) => modifierPrixPrestationAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const activer = actionAdmin(
  { schema: entreeActiverPrestation, nom: 'adminMajReferentiel', permission },
  async (e, ctx) => activerPrestationAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const flag = actionAdmin(
  { schema: entreeFlagAdmin, nom: 'adminChangerFlag', permission },
  async (e, ctx) => changerFlagAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);

const fin = (r: { ok: boolean } & ({ ok: true } | { ok: false; message: string })) => {
  revalidatePath('/admin/referentiels');
  return r.ok ? null : r.message;
};

/** Nouveaux prix d'une prestation (nouvelle version, motif obligatoire). */
export async function modifierPrix(e: z.input<typeof entreePrixPrestation>) {
  return fin(await prix(e));
}
export async function activerPrestation(e: z.input<typeof entreeActiverPrestation>) {
  return fin(await activer(e));
}
export async function changerFlag(e: z.input<typeof entreeFlagAdmin>) {
  return fin(await flag(e));
}
