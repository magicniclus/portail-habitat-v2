import 'server-only';
import { estEmulateur } from '@ph/firebase/admin';

/** Délai maximal d’une lecture : la page s'affiche sans les chiffres plutôt que d'attendre. */
const DELAI_MS = 2500;

/**
 * Firestore n'est lu que s'il est joignable (émulateur, identifiants de service ou Google Cloud) :
 * au build CI, les pages sont générées sans données puis régénérées toutes les heures (ISR).
 */
export function firestoreConfigure(env = process.env): boolean {
  return (
    estEmulateur(env) ||
    Boolean(env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) ||
    Boolean(env.K_SERVICE || env.FIREBASE_CONFIG)
  );
}

/** Lecture bornée dans le temps : `null` si Firestore est absent, lent ou en erreur (la page s'affiche quand même). */
export async function lire<T>(quoi: string, lecture: () => Promise<T>): Promise<T | null> {
  if (!firestoreConfigure()) return null;
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lecture(),
      new Promise<never>((_, rejeter) => {
        minuterie = setTimeout(() => rejeter(new Error('délai dépassé')), DELAI_MS);
      }),
    ]);
  } catch (e) {
    console.warn(`lecture « ${quoi} » impossible`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}
