import { randomBytes } from 'node:crypto';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/** Un plan joint reste lisible par les artisans un an (DES-44). */
const DUREE_PLAN_JOINT = 365 * 24 * 60 * 60 * 1000;

/**
 * Plan joint à une demande (DES-44, D90) : il doit appartenir au particulier **connecté** ; un
 * lien de partage en lecture seule est créé dans la même transaction que la demande. Lectures
 * d'abord (`lire`), écriture ensuite (`ecrire`), comme l'exige une transaction Firestore.
 */
export function joindrePlan(
  db: Firestore,
  t: Transaction,
  uid: string | null | undefined,
  planId: string,
) {
  const proprietaire = { type: 'particulier' as const, id: uid ?? '' };
  return {
    async lire() {
      if (!uid)
        throw new ErreurMetier('PERMISSION_REFUSEE', 'Connectez-vous pour joindre votre plan.');
      const plan = await t.get(db.doc(chemins.plan(proprietaire, planId)));
      if (!plan.exists || plan.get('supprimeLe'))
        throw new ErreurMetier('INTROUVABLE', 'Ce plan n’existe plus.');
    },
    ecrire(maintenant: number): { planId: string; jeton: string } {
      const jeton = randomBytes(24).toString('base64url');
      t.create(db.doc(chemins.partagePlan(jeton)), {
        proprietaire,
        planId,
        versionId: 'courante',
        expireLe: Timestamp.fromMillis(maintenant + DUREE_PLAN_JOINT),
        revoque: false,
        creeLe: Timestamp.fromMillis(maintenant),
        creePar: uid,
      });
      return { planId, jeton };
    },
  };
}
