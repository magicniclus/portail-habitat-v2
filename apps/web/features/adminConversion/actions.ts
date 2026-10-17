'use server';

import {
  entreeActionCycle,
  entreeBasculerSequence,
  entreeReglagesCycle,
  entreeSequenceAdmin,
  entreeSupprimerSequence,
} from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  agirSurCycleAdmin,
  basculerSequenceAdmin,
  dupliquerSequenceAdmin,
  enregistrerReglagesCycleAdmin,
  enregistrerSequenceAdmin,
  supprimerSequenceAdmin,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

/** Back-office › Conversion (ADMIN §2.8b) : écritures, motif obligatoire, audit côté serveur. */
const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });
const fini = (r: { ok: boolean; message?: string }) => {
  revalidatePath('/admin/conversion', 'layout');
  return r.ok ? null : (r.message ?? 'Erreur');
};

const enregistrer = actionAdmin(
  {
    schema: entreeSequenceAdmin,
    nom: 'adminSequenceModifier',
    permission: 'conversion.configurer',
  },
  async ({ motif, ...sequence }, ctx) =>
    enregistrerSequenceAdmin(services(), { acteurUid: ctx.uid!, sequence, motif }),
);
const basculer = actionAdmin(
  {
    schema: entreeBasculerSequence,
    nom: 'adminSequenceModifier',
    permission: 'conversion.configurer',
  },
  async (e, ctx) => basculerSequenceAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const dupliquer = actionAdmin(
  {
    schema: entreeBasculerSequence.omit({ actif: true }),
    nom: 'adminSequenceCreer',
    permission: 'conversion.configurer',
  },
  async (e, ctx) => dupliquerSequenceAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const supprimer = actionAdmin(
  {
    schema: entreeSupprimerSequence,
    nom: 'adminSequenceSupprimer',
    permission: 'conversion.configurer',
  },
  async ({ confirmation: _, versSequence, ...e }, ctx) =>
    supprimerSequenceAdmin(services(), {
      acteurUid: ctx.uid!,
      ...e,
      ...(versSequence ? { versSequence } : {}),
    }),
);
const agir = actionAdmin(
  { schema: entreeActionCycle, nom: 'adminCycleAction', permission: 'conversion.piloter' },
  async (e, ctx) => agirSurCycleAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const regler = actionAdmin(
  { schema: entreeReglagesCycle, nom: 'adminReglagesCycle', permission: 'conversion.configurer' },
  async ({ motif, ...reglages }, ctx) =>
    enregistrerReglagesCycleAdmin(services(), { acteurUid: ctx.uid!, reglages, motif }),
);

type SaisieSequence = z.input<typeof entreeSequenceAdmin>;

/** L'étape d'entrée vient d'un select : validée par le schéma côté serveur. */
export async function enregistrerSequence(
  e: Omit<SaisieSequence, 'etapeEntree'> & { etapeEntree: string },
) {
  return fini(await enregistrer(e as SaisieSequence));
}
export async function basculerSequence(id: string, actif: boolean, motif: string) {
  return fini(await basculer({ id, actif, motif }));
}
export async function dupliquerSequence(id: string, motif: string) {
  return fini(await dupliquer({ id, motif }));
}
export async function supprimerSequence(e: z.input<typeof entreeSupprimerSequence>) {
  return fini(await supprimer(e));
}
export async function agirSurCycle(e: z.input<typeof entreeActionCycle>) {
  return fini(await agir(e));
}
export async function enregistrerReglages(e: z.input<typeof entreeReglagesCycle>) {
  return fini(await regler(e));
}
