import type { JourStats } from '@ph/core/espace-pro';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/** Jours de `statsJour` depuis `depuis` (inclus, « AAAA-MM-JJ ») : l'identifiant du document est la date. */
export async function lireStatsJours(
  db: Firestore,
  artisanId: string,
  depuis: string,
): Promise<JourStats[]> {
  const parent = db.doc(chemins.statsJour(artisanId, depuis)).parent;
  const r = await parent.where(FieldPath.documentId(), '>=', depuis).get();
  return r.docs.map((d) => ({
    jour: d.id,
    vuesFiche: (d.get('vuesFiche') as number | undefined) ?? 0,
    clicsTelephone: (d.get('clicsTelephone') as number | undefined) ?? 0,
    clicsDevis: (d.get('clicsDevis') as number | undefined) ?? 0,
  }));
}
