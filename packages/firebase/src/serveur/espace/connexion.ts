import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeConnexionLien } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { nouvelUtilisateur } from '../comptes/utilisateurs';

export interface ServicesConnexion {
  db: Firestore;
  auth: Auth;
  horloge: () => number;
  /** Clé d'API Web du projet (publique) ; l'émulateur accepte n'importe quelle valeur. */
  cleApi: string;
  /** `https://identitytoolkit.googleapis.com`, ou l'émulateur Auth. */
  urlIdentite: string;
  fetch?: typeof fetch;
}

/** Adresse de l'API d'identité : l'émulateur Auth si `FIREBASE_AUTH_EMULATOR_HOST` est défini. */
export const urlIdentite = (env = process.env) =>
  env.FIREBASE_AUTH_EMULATOR_HOST
    ? `http://${env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com';

const LIEN_INVALIDE =
  'Ce lien a expiré ou a déjà servi, ou l’adresse ne correspond pas. Demandez un nouveau lien.';

/**
 * Retour du lien magique (COMPTES §2 et §5) : le serveur échange le code contre un jeton
 * d'identification (API REST d'identité, sans SDK dans le navigateur), puis crée le profil
 * particulier s'il manque. Le jeton sert aussitôt à ouvrir la session (cookie httpOnly).
 */
export async function connecterParLien(
  s: ServicesConnexion,
  e: z.output<typeof entreeConnexionLien>,
): Promise<{ jetonId: string; uid: string }> {
  const r = await (s.fetch ?? fetch)(
    `${s.urlIdentite}/v1/accounts:signInWithEmailLink?key=${encodeURIComponent(s.cleApi)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: e.email, oobCode: e.oobCode }),
    },
  ).catch(() => null);
  if (!r?.ok) throw new ErreurMetier('NON_AUTHENTIFIE', LIEN_INVALIDE);
  const { idToken, localId } = (await r.json()) as { idToken?: string; localId?: string };
  if (!idToken || !localId) throw new ErreurMetier('NON_AUTHENTIFIE', LIEN_INVALIDE);

  const maintenant = new Date(s.horloge());
  const ref = s.db.doc(chemins.user(localId));
  await s.db.runTransaction(async (t) => {
    const profil = await t.get(ref);
    if (!profil.exists)
      t.set(
        ref,
        nouvelUtilisateur({
          email: e.email,
          roles: ['particulier'],
          origine: 'inscription',
          fournisseurs: ['lien'],
          emailVerifie: true,
          maintenant,
        }),
      );
    // Premier clic sur le lien d'une demande : l'adresse est désormais vérifiée (COMPTES §2, 5.).
    else if (profil.get('emailVerifie') !== true)
      t.update(ref, { emailVerifie: true, updatedAt: maintenant });
  });
  return { jetonId: idToken, uid: localId };
}
