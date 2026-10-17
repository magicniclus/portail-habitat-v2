import type { CleEncart } from '@ph/core/paiements';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/** « Plus tard » : l'encart reste masqué 30 jours pour cette personne (PAIEMENTS §4). */
export async function masquerEncart(
  db: Firestore,
  uid: string,
  cle: CleEncart,
  maintenant: number,
) {
  await db
    .doc(chemins.user(uid))
    .set({ encartsMasques: { [cle]: Timestamp.fromMillis(maintenant) } }, { merge: true });
}

/** Encarts masqués de la personne : clé → date (ms). */
export async function lireEncartsMasques(
  db: Firestore,
  uid: string,
): Promise<Record<string, number>> {
  const m = (await db.doc(chemins.user(uid)).get()).get('encartsMasques') as
    Record<string, Timestamp> | undefined;
  return Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, v.toMillis()]));
}
