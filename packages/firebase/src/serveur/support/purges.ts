import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

const J = 86_400_000;
const LOT = 400;

/** Coordonnées de remplacement : les écrans qui lisent une demande ancienne restent lisibles. */
const CONTACT_ANONYME = {
  prenom: 'Anonymisé',
  nom: '',
  email: 'anonyme@anonyme.invalid',
  telephone: '+33100000000',
};

/**
 * Chaque nuit (DATABASE §14) : demandes et dossiers de diagnostic arrivés à `expireLe` (3 ans
 * après le dernier contact) anonymisés — coordonnées, précisions libres, photos, IP, navigateur,
 * messages — en gardant ce qui sert aux statistiques (prestation, commune, estimation, statut).
 * Puis traces `matching` de plus de 18 mois supprimées.
 */
export async function purgerDonneesExpirees(
  db: Firestore,
  maintenant: number,
  supprimerFichier: (chemin: string) => Promise<void>,
): Promise<{ anonymisees: number; tracesSupprimees: number }> {
  let anonymisees = 0;
  for (const collection of [collections.demandes, collections.dossiersDiag]) {
    for (;;) {
      const r = await db
        .collection(collection)
        .where('expireLe', '<=', Timestamp.fromMillis(maintenant))
        .limit(LOT)
        .get();
      if (r.empty) break;
      for (const d of r.docs) {
        const photos = (d.get('photos') as { storagePath: string }[] | undefined) ?? [];
        await Promise.all(photos.map((p) => supprimerFichier(p.storagePath)));
        const messages = await d.ref.collection('messages').limit(LOT).get();
        const lot = db.batch();
        for (const m of messages.docs) lot.delete(m.ref);
        lot.update(d.ref, {
          contact: CONTACT_ANONYME,
          particulierUid: null,
          photos: [],
          precisions: FieldValue.delete(),
          ipHash: FieldValue.delete(),
          userAgent: FieldValue.delete(),
          // Plus d'échéance : la demande ne repasse jamais dans cette purge.
          expireLe: FieldValue.delete(),
          anonymiseeLe: Timestamp.fromMillis(maintenant),
        });
        await lot.commit();
        anonymisees++;
      }
    }
  }
  let tracesSupprimees = 0;
  for (;;) {
    const r = await db
      .collection(collections.matching)
      .where('createdAt', '<', Timestamp.fromMillis(maintenant - 548 * J))
      .limit(LOT)
      .get();
    if (r.empty) break;
    const lot = db.batch();
    for (const d of r.docs) lot.delete(d.ref);
    await lot.commit();
    tracesSupprimees += r.size;
  }
  return { anonymisees, tracesSupprimees };
}
