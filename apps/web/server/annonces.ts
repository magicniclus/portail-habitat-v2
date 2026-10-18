import 'server-only';
import { annoncesVisibles, type AnnonceLue } from '@ph/core/admin';
import { appAdmin } from '@ph/firebase/admin';
import { lireAnnoncesActives } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import { lire } from './lecture';

const actives = cache(
  async () => (await lire('annonces', () => lireAnnoncesActives(getFirestore(appAdmin())))) ?? [],
);

/** Annonces en cours pour un public (une lecture par rendu, bornée dans le temps). */
export async function annoncesPour(public_: 'pros' | 'particuliers'): Promise<AnnonceLue[]> {
  return annoncesVisibles(await actives(), public_, Date.now());
}
