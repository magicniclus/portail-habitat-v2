import { qualifierPartenaire } from '@ph/core/partenaires';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { empreinteJeton } from '../comptes/services';

/**
 * Lien du SMS de confirmation (demande partenaire au téléphone non vérifié) : numéro confirmé,
 * niveau recalculé (B → A possible). Lien à usage unique.
 */
export async function confirmerTelephonePartenaire(
  s: { db: Firestore; horloge: () => number },
  jeton: string,
): Promise<'confirme' | 'invalide'> {
  if (!/^[\w-]{20,100}$/.test(jeton)) return 'invalide';
  const r = await s.db
    .collection(collections.demandes)
    .where('partenaire.jetonTelephoneHash', '==', empreinteJeton(jeton))
    .limit(1)
    .get();
  const doc = r.docs[0];
  if (!doc) return 'invalide';
  return s.db.runTransaction(async (t) => {
    const d = await t.get(doc.ref);
    if (d.get('partenaire.jetonTelephoneHash') !== empreinteJeton(jeton)) return 'invalide';
    const q = d.get('qualification') as Parameters<typeof qualifierPartenaire>[0];
    const qualif = qualifierPartenaire(
      { ...q, telephoneVerifie: true },
      { eligibilite: d.get('aides.eligibilite') as 'eligible' },
    );
    t.update(doc.ref, {
      'partenaire.jetonTelephoneHash': FieldValue.delete(),
      'qualification.telephoneVerifie': true,
      'qualification.score': qualif.score,
      'qualification.niveau': qualif.niveau,
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
    return 'confirme';
  });
}
