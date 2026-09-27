import type { ContexteBase } from '@ph/core/enveloppe';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { appAdmin } from '../admin';

/** Nom du cookie de session (le seul que Firebase Hosting transmet, par cohérence entre hébergeurs). */
export const COOKIE_SESSION = '__session';

/** Durées de session (COMPTES §5) : 14 jours pour les particuliers, 7 jours pour les pros. */
export const DUREE_SESSION_MS = { particulier: 14 * 86_400_000, pro: 7 * 86_400_000 } as const;
export type EspaceSession = keyof typeof DUREE_SESSION_MS;

/** Un cookie de session ne se crée qu'après une connexion récente (recommandation Firebase). */
const CONNEXION_RECENTE_MS = 5 * 60_000;

/** Champs du contexte d'enveloppe tirés d'un jeton vérifié (callable ou cookie de session). */
export function contexteDepuisJeton(
  jeton: Pick<DecodedIdToken, 'uid' | 'auth_time' | 'firebase'> & { imp?: unknown },
): Pick<ContexteBase, 'uid' | 'impersonation' | 'authentifieLe' | 'secondFacteur'> {
  return {
    uid: jeton.uid,
    impersonation: jeton.imp !== undefined,
    authentifieLe: jeton.auth_time * 1000,
    secondFacteur: Boolean(jeton.firebase?.sign_in_second_factor),
  };
}

/**
 * Échange un jeton d'identification contre un cookie de session (POST /api/session).
 * Refuse un jeton révoqué ou une connexion trop ancienne.
 */
export async function creerCookieSession(
  jetonId: string,
  espace: EspaceSession,
  maintenant = Date.now(),
): Promise<{ cookie: string; dureeMs: number } | null> {
  const auth = getAuth(appAdmin());
  let decode: DecodedIdToken;
  try {
    decode = await auth.verifyIdToken(jetonId, true);
  } catch {
    return null;
  }
  if (maintenant - decode.auth_time * 1000 > CONNEXION_RECENTE_MS) return null;
  const dureeMs = DUREE_SESSION_MS[espace];
  return { cookie: await auth.createSessionCookie(jetonId, { expiresIn: dureeMs }), dureeMs };
}

/** Vérifie le cookie de session, révocations comprises (retrait d'un membre, suspension). */
export async function lireSession(cookie: string | undefined): Promise<DecodedIdToken | null> {
  if (!cookie) return null;
  try {
    return await getAuth(appAdmin()).verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
