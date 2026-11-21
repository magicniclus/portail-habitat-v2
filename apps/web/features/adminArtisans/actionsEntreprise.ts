'use server';

import {
  entreeCreerEntrepriseAdmin,
  entreeRecalculFicheAdmin,
  entreeRevendicationAdmin,
  entreeSuppressionEntrepriseAdmin,
  entreeTransfertAdmin,
} from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  creerEntrepriseAdmin,
  inviterRevendicationAdmin,
  recalculerFicheAdmin,
  supprimerEntrepriseAdmin,
  transfererProprieteAdmin,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';

/** Back-office › Artisans : actions sur l'entreprise (COMPTES §3.5 et §4.8), motif et audit. */
const fini = (r: { ok: boolean; message?: string }) => {
  revalidatePath('/admin/artisans');
  return r.ok ? null : (r.message ?? 'Erreur');
};

const creer = actionAdmin(
  { schema: entreeCreerEntrepriseAdmin, nom: 'adminCreerEntreprise', permission: 'artisans.creer' },
  async (e, ctx) => creerEntrepriseAdmin(servicesComptes(), { acteurUid: ctx.uid!, ...e }),
);
export async function creerEntreprise(e: z.input<typeof entreeCreerEntrepriseAdmin>) {
  return fini(await creer(e));
}

const revendication = actionAdmin(
  {
    schema: entreeRevendicationAdmin,
    nom: 'adminInviterRevendication',
    permission: 'artisans.creer',
  },
  async (e, ctx) => inviterRevendicationAdmin(servicesComptes(), { acteurUid: ctx.uid!, ...e }),
);
export async function inviterRevendication(e: z.input<typeof entreeRevendicationAdmin>) {
  return fini(await revendication(e));
}

const transfert = actionAdmin(
  {
    schema: entreeTransfertAdmin,
    nom: 'adminTransfererPropriete',
    permission: 'artisans.modifier',
  },
  async (e, ctx) => transfererProprieteAdmin(servicesComptes(), { acteurUid: ctx.uid!, ...e }),
);
export async function transfererPropriete(e: z.input<typeof entreeTransfertAdmin>) {
  return fini(await transfert(e));
}

const suppression = actionAdmin(
  {
    schema: entreeSuppressionEntrepriseAdmin,
    nom: 'adminSupprimerEntreprise',
    permission: 'artisans.supprimer',
  },
  async (e, ctx) => supprimerEntrepriseAdmin(servicesComptes(), { acteurUid: ctx.uid!, ...e }),
);
export async function supprimerEntreprise(e: z.input<typeof entreeSuppressionEntrepriseAdmin>) {
  return fini(await suppression(e));
}

const recalcul = actionAdmin(
  {
    schema: entreeRecalculFicheAdmin,
    nom: 'adminRecalculerFiche',
    permission: 'artisans.modifier',
  },
  async (e, ctx) =>
    recalculerFicheAdmin(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { acteurUid: ctx.uid!, ...e },
    ),
);
/** Rend le message du résultat (publiée, retirée, invalide) ou l'erreur. */
export async function recalculerFiche(
  artisanId: string,
): Promise<{ ok: boolean; message: string }> {
  const r = await recalcul({ artisanId });
  revalidatePath('/admin/artisans');
  return r.ok ? { ok: true, message: r.data } : { ok: false, message: r.message };
}
