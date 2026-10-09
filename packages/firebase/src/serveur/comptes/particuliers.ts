import { chemins } from '../../chemins';
import type { ServicesComptes } from './services';
import { nouvelUtilisateur } from './utilisateurs';

/**
 * Flux « demande sans compte » (COMPTES §2) : l'email existe → la demande est rattachée à ce compte
 * **sans connecter personne** ; sinon, compte créé côté serveur (email non vérifié, origine `demande`).
 * Ne renvoie jamais de jeton : l'accès passe par la connexion ou le lien magique envoyé par email.
 */
export async function rattacherOuCreerParticulier(
  s: ServicesComptes,
  email: string,
): Promise<{ uid: string; cree: boolean }> {
  const existant = await s.auth.getUserByEmail(email).catch(() => null);
  if (existant) return { uid: existant.uid, cree: false };
  const compte = await s.auth.createUser({ email, emailVerified: false });
  await s.db.doc(chemins.user(compte.uid)).set(
    nouvelUtilisateur({
      email,
      roles: ['particulier'],
      origine: 'demande',
      fournisseurs: ['lien'],
      emailVerifie: false,
      maintenant: new Date(s.horloge()),
    }),
  );
  return { uid: compte.uid, cree: true };
}
