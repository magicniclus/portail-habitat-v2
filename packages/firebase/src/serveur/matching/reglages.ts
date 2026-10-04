import {
  CONFIG_MATCHING_DEFAUT,
  configDepuisDocument,
  type ConfigMatchingComplete,
  type DocumentConfigMatching,
} from '@ph/core/matching';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/** Configuration active de l'algorithme (`matchingConfig/actif`), sinon les valeurs initiales. */
export async function lireConfigMatching(db: Firestore): Promise<ConfigMatchingComplete> {
  const d = await db.doc(chemins.configMatching()).get();
  return d.exists
    ? configDepuisDocument(d.data() as DocumentConfigMatching, CONFIG_MATCHING_DEFAUT)
    : CONFIG_MATCHING_DEFAUT;
}
