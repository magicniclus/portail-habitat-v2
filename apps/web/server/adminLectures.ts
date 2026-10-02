import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { lireTableauDeBordAdmin, listerFileAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';

/** Lectures des pages admin (l'heure est prise ici, pas pendant le rendu). */
export async function lireTableauEtFile(permissions: readonly string[]) {
  const db = getFirestore(appAdmin());
  const maintenant = Date.now();
  const [tableau, file] = await Promise.all([
    lireTableauDeBordAdmin(db, { maintenant, finances: permissions.includes('finances.lire') }),
    listerFileAdmin(db, { permissions, maintenant }),
  ]);
  return { maintenant, tableau, file };
}

export async function lireFile(permissions: readonly string[]) {
  const maintenant = Date.now();
  return {
    maintenant,
    file: await listerFileAdmin(getFirestore(appAdmin()), { permissions, maintenant }),
  };
}
