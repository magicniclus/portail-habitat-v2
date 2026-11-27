'use server';

import { entreeCreerSerieStudio, entreeEpisodeStudio, entreeSerieStudio } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { creerSerieStudio, episodeSuivantStudio, supprimerSerieStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesStudio } from './services';

/** Séries d'épisodes (STUDIO.md §13). */
const P = 'studio.utiliser' as const;
const fin = <T>(r: { ok: true; data: T } | { ok: false; message: string }) => {
  revalidatePath('/admin/studio');
  return r.ok ? { ok: true as const, data: r.data } : { ok: false as const, message: r.message };
};

const creer = actionAdmin(
  { schema: entreeCreerSerieStudio, nom: 'adminStudioCreerSerie', permission: P },
  async (e, ctx) =>
    creerSerieStudio(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { ...e, auteurUid: ctx.uid! },
    ),
);
export const creerSerie = async (e: z.input<typeof entreeCreerSerieStudio>) => fin(await creer(e));

const episode = actionAdmin(
  { schema: entreeEpisodeStudio, nom: 'adminStudioEpisode', permission: P },
  async (e, ctx) => episodeSuivantStudio(servicesStudio(), { ...e, auteurUid: ctx.uid! }),
);
export const episodeSuivant = async (e: z.input<typeof entreeEpisodeStudio>) =>
  fin(await episode(e));

const supprimer = actionAdmin(
  { schema: entreeSerieStudio, nom: 'adminStudioSupprimerSerie', permission: P },
  async (e) => supprimerSerieStudio(getFirestore(appAdmin()), e.serieId),
);
export const supprimerSerie = async (e: z.input<typeof entreeSerieStudio>) =>
  fin(await supprimer(e));
