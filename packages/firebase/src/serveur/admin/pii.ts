import { ErreurMetier } from '@ph/core/erreurs';
import type { Firestore } from 'firebase-admin/firestore';
import { auditerAdmin } from './audit';

/**
 * Données personnelles qu'un écran admin peut afficher en clair (ADM-02) : liste fermée de
 * collections et de champs. Chaque consultation est journalisée.
 */
const CHAMPS: Record<string, readonly string[]> = {
  demandes: ['contact.email', 'contact.telephone', 'contact.nom'],
  users: ['email', 'telephone'],
  artisans: ['emailContact', 'telephonePublic', 'adresseSiege.ligne1'],
};

export async function afficherDonneePersonnelle(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; pii: boolean; cible: string; champ: string },
): Promise<string> {
  if (!e.pii) throw new ErreurMetier('PERMISSION_REFUSEE');
  const [collection, id, ...reste] = e.cible.split('/');
  if (!collection || !id || reste.length || !CHAMPS[collection]?.includes(e.champ))
    throw new ErreurMetier('ENTREE_INVALIDE');
  const doc = await s.db.collection(collection).doc(id).get();
  if (!doc.exists) throw new ErreurMetier('INTROUVABLE');
  const valeur = doc.get(e.champ) as unknown;
  await auditerAdmin(
    s.db,
    { acteurUid: e.acteurUid, action: 'pii.afficher', cible: e.cible, apres: { champ: e.champ } },
    s.horloge(),
  );
  return typeof valeur === 'string' ? valeur : '';
}
