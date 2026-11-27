import 'server-only';
import { ErreurMetier } from '@ph/core/erreurs';
import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import type { ContexteDessin, ServicesDessin } from '@ph/firebase/dessin';
import { getFirestore } from 'firebase-admin/firestore';
import { entrepriseAutorisee } from './demandesPro';
import { flagActif } from './flags';

export type EspaceDessin = 'particulier' | 'entreprise';

export const servicesDessin = (): ServicesDessin => ({
  db: getFirestore(appAdmin()),
  bucket: bucketFichiers(),
  horloge: Date.now,
});

/**
 * Propriétaire des plans selon l'espace : le particulier connecté, ou l'entreprise active
 * (membre avec `dessin.gerer`). Dessin fermé tant que le flag `dessin` est inactif.
 */
export async function contexteDessin(uid: string, espace: EspaceDessin): Promise<ContexteDessin> {
  if (!(await flagActif('dessin'))) throw new ErreurMetier('INTROUVABLE');
  if (espace === 'particulier') return { proprietaire: { type: 'particulier', id: uid }, uid };
  const artisanId = await entrepriseAutorisee(uid, 'dessin.gerer');
  return { proprietaire: { type: 'entreprise', id: artisanId }, uid };
}
