import type { entreeEvenementFiche } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

const CHAMP = { vue: 'vuesFiche', tel: 'clicsTelephone', devis: 'clicsDevis' } as const;

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

/**
 * Vue de la fiche, clic sur le téléphone ou sur « Demander un devis » : une écriture dans
 * `artisans/{id}/statsJour/{jour}` (DATABASE §5), seulement pour une fiche en ligne.
 */
export async function compterEvenementFiche(
  s: { db: Firestore; horloge: () => number },
  e: z.output<typeof entreeEvenementFiche>,
): Promise<boolean> {
  const fiche = await s.db.doc(chemins.artisanPublic(e.artisanId)).get();
  if (fiche.get('enLigne') !== true) return false;
  await s.db
    .doc(chemins.statsJour(e.artisanId, jourParis(s.horloge())))
    .set({ schemaVersion: 1, [CHAMP[e.type]]: FieldValue.increment(1) }, { merge: true });
  return true;
}

/** Une demande proposée à l'entreprise (matching) : compteur du jour. */
export async function compterDemandeRecue(
  db: Firestore,
  artisanId: string,
  maintenant: number,
): Promise<void> {
  await db
    .doc(chemins.statsJour(artisanId, jourParis(maintenant)))
    .set({ schemaVersion: 1, demandesRecues: FieldValue.increment(1) }, { merge: true });
}
