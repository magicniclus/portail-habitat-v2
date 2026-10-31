import { echeanceDecennale, messageEcheance, type PalierAssurance } from '@ph/core/espace-pro';
import { formatDate } from '@ph/core/format';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import type { Notifier } from '../comptes/services';

const J = 86_400_000;

/**
 * Chaque nuit : attestations décennales qui expirent dans 30 jours, 7 jours ou aujourd'hui
 * (`assurance-expire`, email + SMS). À l'échéance, la fiche est retirée (hors ligne, label ôté)
 * jusqu'à l'envoi d'une nouvelle attestation, qui la remet en ligne (`enregistrerDocument`).
 */
export async function verifierAssurances(s: {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
}): Promise<{ rappels: number; retirees: number }> {
  const maintenant = s.horloge();
  const r = await s.db
    .collection(collections.artisans)
    .where('labelsVerifies.decennale.expireLe', '<=', Timestamp.fromMillis(maintenant + 30 * J))
    .limit(500)
    .get();
  let rappels = 0;
  let retirees = 0;
  for (const a of r.docs) {
    if (a.get('statut') !== 'actif') continue;
    const expireLe = (a.get('labelsVerifies.decennale.expireLe') as Timestamp).toMillis();
    // Les rappels déjà envoyés valent pour cette date d'échéance seulement.
    const suivi = (a.get('relancesDecennale') as
      ({ pour: Timestamp } & Partial<Record<PalierAssurance, Timestamp>>) | undefined) ?? {
      pour: Timestamp.fromMillis(0),
    };
    const envoyes = suivi.pour.toMillis() === expireLe ? suivi : {};
    const e = echeanceDecennale(expireLe, maintenant, {
      j30: 'j30' in envoyes,
      j7: 'j7' in envoyes,
      j0: 'j0' in envoyes,
    });
    if (!e) continue;
    const t = Timestamp.fromMillis(maintenant);
    await a.ref.update({
      relancesDecennale: { ...envoyes, pour: Timestamp.fromMillis(expireLe), [e.palier]: t },
      ...(e.suspendre
        ? { enLigne: false, 'labelsVerifies.decennale': FieldValue.delete(), updatedAt: t }
        : {}),
    });
    const proprietaire = a.get('proprietaireUid') as string | undefined;
    if (proprietaire)
      await s.notifier({
        modele: 'assurance-expire',
        destinataire: { uid: proprietaire, artisanId: a.id },
        refObjet: `${collections.artisans}/${a.id}/decennale/${expireLe}/${e.palier}`,
        donnees: {
          message: messageEcheance(e.palier, formatDate(expireLe, 'long')),
          lien: '/pro/fiche#documents',
        },
      });
    rappels++;
    if (e.suspendre) retirees++;
  }
  return { rappels, retirees };
}
