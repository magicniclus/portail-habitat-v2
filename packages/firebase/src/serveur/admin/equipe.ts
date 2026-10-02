import { permissionsEffectives } from '@ph/core/admin';
import type { Auth } from 'firebase-admin/auth';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { synchroniserClaims } from '../comptes/claims';

/**
 * Premier super-administrateur (script `pnpm admin:creer`) : compte créé s'il n'existe pas, sans
 * mot de passe connu (lien de définition renvoyé), `admins/{uid}` et claims `staff` à jour.
 * La double authentification est exigée dès la première connexion (ADMIN §1).
 */
export async function creerSuperAdmin(
  s: { db: Firestore; auth: Auth; horloge: () => number },
  e: { email: string; nom: string },
): Promise<{ uid: string; lienMotDePasse: string; cree: boolean }> {
  const email = e.email.trim().toLowerCase();
  let uid: string;
  let cree = false;
  try {
    uid = (await s.auth.getUserByEmail(email)).uid;
  } catch {
    uid = (await s.auth.createUser({ email, emailVerified: true, displayName: e.nom })).uid;
    cree = true;
  }
  const maintenant = Timestamp.fromMillis(s.horloge());
  const refUser = s.db.doc(chemins.user(uid));
  if (!(await refUser.get()).exists)
    await refUser.set({
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      roles: [],
      email,
      emailVerifie: true,
      nomAffiche: e.nom,
      entreprises: [],
      fournisseurs: ['password'],
      origine: 'admin',
      statut: 'actif',
    });
  await s.db.doc(chemins.admin(uid)).set({
    schemaVersion: 1,
    createdAt: maintenant,
    nom: e.nom,
    email,
    role: 'superadmin',
    permissionsPlus: [],
    permissionsMoins: [],
    permissionsEffectives: permissionsEffectives({ role: 'superadmin' }),
    mfaObligatoire: true,
    actif: true,
  });
  await synchroniserClaims(
    { db: s.db, auth: s.auth, horloge: s.horloge, notifier: async () => undefined },
    uid,
  );
  return { uid, lienMotDePasse: await s.auth.generatePasswordResetLink(email), cree };
}
