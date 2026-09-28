import 'server-only';
import { flag, FLAGS, type NomFlag, type ValeursFlags } from '@ph/core/flags';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import { lire } from './lecture';

/**
 * Flags globaux (`config/flags`, modifiables en un clic depuis l'administration, D8) ; valeurs par
 * défaut de `@ph/core/flags` si Firestore est indisponible.
 */
const globales = cache(async (): Promise<ValeursFlags> => {
  const brut = await lire('config/flags', async () =>
    (await getFirestore(appAdmin()).doc(chemins.configFlags()).get()).data(),
  );
  return Object.fromEntries(
    Object.keys(FLAGS)
      .filter((n) => typeof brut?.[n] === 'boolean')
      .map((n) => [n, brut![n] as boolean]),
  ) as ValeursFlags;
});

export async function flagActif(nom: NomFlag): Promise<boolean> {
  return flag(nom, { globales: await globales() });
}
