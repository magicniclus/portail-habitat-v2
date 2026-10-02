'use server';

import { entreeActionArtisanAdmin, entreeCrediterAdmin } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import {
  crediterArtisanAdmin,
  sanctionnerArtisanAdmin,
  verifierArtisanAdmin,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });

const verifier = actionAdmin(
  {
    schema: entreeActionArtisanAdmin,
    nom: 'adminVerifierArtisan',
    permission: 'artisans.verifier',
  },
  async (e, ctx) => verifierArtisanAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const sanctionner = actionAdmin(
  { schema: entreeActionArtisanAdmin, nom: 'adminSanctionner', permission: 'artisans.suspendre' },
  async (e, ctx) =>
    sanctionnerArtisanAdmin(services(), {
      acteurUid: ctx.uid!,
      artisanId: e.artisanId,
      action: e.action === 'lever' ? 'lever' : 'suspendre',
      motif: e.motif,
    }),
);
const crediter = actionAdmin(
  { schema: entreeCrediterAdmin, nom: 'adminCrediter', permission: 'credits.crediter' },
  async (e, ctx) => {
    const r = await lireSessionAdmin();
    const illimite = r.etat === 'ok' && r.session.permissions.includes('credits.crediter_illimite');
    return crediterArtisanAdmin(services(), { acteurUid: ctx.uid!, illimite, ...e });
  },
);

/** Vérifier, suspendre ou lever la suspension (motif obligatoire, audit avant/après). */
export async function agirSurArtisan(
  artisanId: string,
  action: 'verifier' | 'suspendre' | 'lever',
  motif: string,
): Promise<string | null> {
  const r = await (action === 'verifier' ? verifier : sanctionner)({ artisanId, action, motif });
  revalidatePath('/admin/artisans');
  return r.ok ? null : r.message;
}

/** Geste commercial en crédits (5 au plus sans `credits.crediter_illimite`). */
export async function crediterArtisan(
  artisanId: string,
  credits: number,
  motif: string,
): Promise<string | null> {
  const r = await crediter({ artisanId, credits, motif });
  revalidatePath('/admin/artisans');
  return r.ok ? null : r.message;
}
