import { GeoPoint, type Firestore } from 'firebase-admin/firestore';
import { versFirestore } from '../conversion';
import type { Documents } from './referentiel';

const TAILLE_LOT = 400;

/**
 * Référentiel réel (prestations, prix privés, recherche, communes) importé dans un projet qui ne
 * l'a pas : aucun compte ni donnée de test, contrairement au seed. Par défaut, un document déjà
 * présent n'est jamais touché (prix modifiés dans l'admin préservés) ; `ecraser` le remplace.
 */
export async function importerReferentiel(
  db: Firestore,
  docs: Documents,
  o: { ecraser?: boolean } = {},
): Promise<{ crees: number; gardes: number; ecrases: number }> {
  const entrees = [...docs.entries()];
  let crees = 0;
  let gardes = 0;
  let ecrases = 0;
  for (let i = 0; i < entrees.length; i += TAILLE_LOT) {
    const tranche = entrees.slice(i, i + TAILLE_LOT);
    const existants = await db.getAll(...tranche.map(([c]) => db.doc(c)));
    const lot = db.batch();
    tranche.forEach(([chemin, donnees], k) => {
      const existe = existants[k]!.exists;
      if (existe && !o.ecraser) return void gardes++;
      if (existe) ecrases++;
      else crees++;
      lot.set(
        db.doc(chemin),
        versFirestore(donnees, (lat, lng) => new GeoPoint(lat, lng)) as Record<string, unknown>,
      );
    });
    await lot.commit();
  }
  return { crees, gardes, ecrases };
}
