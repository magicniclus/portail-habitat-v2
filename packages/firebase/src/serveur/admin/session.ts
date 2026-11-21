import {
  DUREE_SESSION_ADMIN_MS,
  INACTIVITE_ADMIN_MS,
  permissionsEffectives,
  ROLES_ADMIN_SYSTEME,
} from '@ph/core/admin';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

export interface ProfilAdminSession {
  uid: string;
  nom: string;
  email: string;
  role: string;
  permissions: string[];
  /** Le rôle `lecture` ne voit jamais les données personnelles. */
  pii: boolean;
  /**
   * `false` quand le rôle donne aujourd'hui d'autres permissions que celles enregistrées (une
   * permission ajoutée depuis, ex. Studio) : l'appelant les recalcule (`recalculerPermissionsMembre`).
   */
  permissionsAJour: boolean;
}

export type EtatSessionAdmin =
  | { etat: 'ok'; profil: ProfilAdminSession }
  | { etat: 'pas_admin' }
  | { etat: 'expiree' }
  | { etat: 'inactivite' };

/** Écriture de `dernierAcces` au plus une fois par minute (COUTS). */
const PAS_ACCES_MS = 60_000;

/**
 * Contrôle de chaque page admin (ADMIN §1) : membre actif de l'équipe, connexion de moins de 8 h,
 * activité dans les 30 dernières minutes. L'activité est notée au passage.
 */
export async function verifierSessionAdmin(
  db: Firestore,
  e: { uid: string; authentifieLe: number; maintenant: number },
): Promise<EtatSessionAdmin> {
  const ref = db.doc(chemins.admin(e.uid));
  const a = await ref.get();
  if (!a.exists || a.get('actif') !== true) return { etat: 'pas_admin' };
  if (e.maintenant - e.authentifieLe > DUREE_SESSION_ADMIN_MS) return { etat: 'expiree' };
  const dernier = (a.get('dernierAcces') as Timestamp | undefined)?.toMillis() ?? 0;
  // Une nouvelle connexion repart de zéro ; sinon la dernière activité notée fait foi.
  if (e.maintenant - Math.max(dernier, e.authentifieLe) > INACTIVITE_ADMIN_MS)
    return { etat: 'inactivite' };
  if (e.maintenant - dernier > PAS_ACCES_MS)
    await ref.update({ dernierAcces: Timestamp.fromMillis(e.maintenant) });
  const enregistrees = (a.get('permissionsEffectives') as string[] | undefined) ?? [];
  const role = a.get('role') as string;
  // Rôles système seulement : un rôle personnalisé se recalcule quand il est modifié.
  const aJour =
    !(ROLES_ADMIN_SYSTEME as readonly string[]).includes(role) ||
    permissionsEffectives({
      role,
      permissionsPlus: (a.get('permissionsPlus') as string[] | undefined) ?? [],
      permissionsMoins: (a.get('permissionsMoins') as string[] | undefined) ?? [],
    }).join() === [...enregistrees].sort().join();
  return {
    etat: 'ok',
    profil: {
      uid: e.uid,
      nom: a.get('nom') as string,
      email: a.get('email') as string,
      role: a.get('role') as string,
      permissions: enregistrees,
      pii: a.get('role') !== 'lecture',
      permissionsAJour: aJour,
    },
  };
}
