import { ErreurMetier } from '@ph/core/erreurs';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/**
 * Plan joint à une demande (DES-44, D90) : il doit appartenir au particulier **connecté**. Aucun
 * lien de partage n'est créé : l'artisan qui accepte la demande le lit par une page authentifiée
 * (`lirePlanJoint`), tant que le client ne l'a pas retiré. Lecture dans la transaction.
 */
export async function verifierPlanJoint(
  db: Firestore,
  t: Transaction,
  uid: string | null | undefined,
  planId: string,
): Promise<{ planId: string; proprietaireId: string }> {
  if (!uid) throw new ErreurMetier('PERMISSION_REFUSEE', 'Connectez-vous pour joindre votre plan.');
  const plan = await t.get(db.doc(chemins.plan({ type: 'particulier', id: uid }, planId)));
  if (!plan.exists || plan.get('supprimeLe'))
    throw new ErreurMetier('INTROUVABLE', 'Ce plan n’existe plus.');
  return { planId, proprietaireId: uid };
}
