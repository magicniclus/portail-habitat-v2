'use server';

import { entreeProgrammerStudio, entreePublicationStudio } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  annulerPublicationStudio,
  programmerPublicationStudio,
  relancerPublicationStudio,
} from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

/** Publication et programmation (STUDIO.md §11) : l'envoi lui-même part de la Function. */
const P = 'studio.utiliser' as const;
const s = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });
const fin = <T>(r: { ok: true; data: T } | { ok: false; message: string }) => {
  revalidatePath('/admin/studio', 'layout');
  return r.ok ? { ok: true as const, data: r.data } : { ok: false as const, message: r.message };
};

const programmer = actionAdmin(
  { schema: entreeProgrammerStudio, nom: 'adminStudioProgrammer', permission: P },
  async (e, ctx) => programmerPublicationStudio(s(), { ...e, auteurUid: ctx.uid! }),
);
export const programmerPublication = async (e: z.input<typeof entreeProgrammerStudio>) =>
  fin(await programmer(e));

const annuler = actionAdmin(
  { schema: entreePublicationStudio, nom: 'adminStudioAnnulerPublication', permission: P },
  async (e) => annulerPublicationStudio(s().db, e.publicationId),
);
export const annulerPublication = async (e: z.input<typeof entreePublicationStudio>) =>
  fin(await annuler(e));

const relancer = actionAdmin(
  { schema: entreePublicationStudio, nom: 'adminStudioRelancerPublication', permission: P },
  async (e) => relancerPublicationStudio(s(), e.publicationId),
);
export const relancerPublication = async (e: z.input<typeof entreePublicationStudio>) =>
  fin(await relancer(e));
