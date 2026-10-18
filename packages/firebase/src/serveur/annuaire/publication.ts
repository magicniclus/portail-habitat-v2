import { projeterArtisanPublic } from '@ph/core/annuaire';
import { artisan, artisanPublic } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { depuisFirestore } from '../../conversion';
import { depot } from '../depot';

export type ResultatPublication =
  | { statut: 'publiee'; fiche: z.output<typeof artisanPublic> }
  | { statut: 'retiree' }
  | { statut: 'invalide'; erreur: string };

/**
 * Recalcule `artisansPublic/{id}` depuis `artisans/{id}` (DATABASE §3, déclencheur à chaque
 * écriture) : publiée, retirée (hors ligne, suspendue, supprimée) ou laissée telle quelle si la
 * fiche privée est invalide (erreur signalée, jamais de fiche partielle en ligne).
 */
export async function publierFiche(
  s: { db: Firestore; horloge: () => number },
  artisanId: string,
): Promise<ResultatPublication> {
  const fiches = depot(s.db, collections.artisansPublic, artisanPublic);
  const snap = await s.db.doc(chemins.artisan(artisanId)).get();
  if (!snap.exists) {
    await fiches.ref(artisanId).delete();
    return { statut: 'retiree' };
  }
  const a = artisan.safeParse(depuisFirestore(snap.data()));
  if (!a.success) return { statut: 'invalide', erreur: a.error.issues[0]?.message ?? 'invalide' };
  const p = projeterArtisanPublic(a.data, new Date(s.horloge()), a.data.adresseSiege.ville);
  if (!p) {
    await fiches.ref(artisanId).delete();
    return { statut: 'retiree' };
  }
  await fiches.ecrire(artisanId, p);
  return { statut: 'publiee', fiche: artisanPublic.parse(p) };
}
