import type { Auth } from 'firebase-admin/auth';
import { GeoPoint, type Firestore } from 'firebase-admin/firestore';
import { versFirestore } from '../conversion';
import type { JeuSeed } from './jeu';

const TAILLE_LOT = 400;

/**
 * Écrit le jeu : comptes Auth (mot de passe commun, email vérifié), claims, puis documents par lots.
 * Relançable : chaque document et chaque compte est écrasé à l'identique.
 */
export async function ecrireJeu(
  db: Firestore,
  auth: Auth,
  jeu: JeuSeed,
  motDePasse: string,
): Promise<{ comptes: number; documents: number }> {
  for (const c of jeu.comptes) {
    const profil = {
      email: c.email,
      password: motDePasse,
      emailVerified: true,
      displayName: c.nomAffiche,
    };
    await auth.createUser({ uid: c.uid, ...profil }).catch(async (e: { code?: string }) => {
      if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') throw e;
      await auth.updateUser(c.uid, profil);
    });
    await auth.setCustomUserClaims(c.uid, { ...jeu.claims.get(c.uid) });
  }
  const entrees = [...jeu.documents.entries()];
  for (let i = 0; i < entrees.length; i += TAILLE_LOT) {
    const lot = db.batch();
    for (const [chemin, donnees] of entrees.slice(i, i + TAILLE_LOT))
      lot.set(
        db.doc(chemin),
        versFirestore(donnees, (lat, lng) => new GeoPoint(lat, lng)) as Record<string, unknown>,
      );
    await lot.commit();
  }
  return { comptes: jeu.comptes.length, documents: entrees.length };
}
