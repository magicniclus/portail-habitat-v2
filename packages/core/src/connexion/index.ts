/** Connexion des pros (COMPTES §5, CON-01 à 03) : règles pures, partagées par l'écran et le serveur. */

/** Même message que l'email existe ou non (CON-01). */
export const MESSAGE_IDENTIFIANTS = 'Email ou mot de passe incorrect.';

const IDENTIFIANTS = new Set([
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
  'auth/user-disabled',
  'auth/missing-password',
]);

export function messageErreurConnexion(code: string): string {
  if (IDENTIFIANTS.has(code)) return MESSAGE_IDENTIFIANTS;
  if (code === 'auth/too-many-requests')
    return 'Trop de tentatives. Patientez quelques minutes ou réinitialisez votre mot de passe.';
  if (code === 'auth/network-request-failed')
    return 'Pas de connexion internet. Vérifiez votre réseau puis réessayez.';
  if (code === 'auth/invalid-verification-code' || code === 'auth/invalid-totp-code')
    return 'Code incorrect. Vérifiez le code affiché par votre application.';
  return 'La connexion n’a pas abouti. Merci de réessayer.';
}

const PREMIER_BLOCAGE = 5;
const DELAI_BASE_MS = 30_000;
const DELAI_MAX_MS = 15 * 60_000;

/** Délai d'attente après `n` échecs (CON-03) : rien avant 5, puis 30 s doublé à chaque échec, 15 min au plus. */
export function delaiApresEchecs(n: number): number {
  if (n < PREMIER_BLOCAGE) return 0;
  return Math.min(DELAI_MAX_MS, DELAI_BASE_MS * 2 ** (n - PREMIER_BLOCAGE));
}

/**
 * CON-02 : propriétaire ou gérant d'une entreprise Premium sans second facteur → activation
 * demandée avant l'accès à la facturation (COMPTES §5).
 */
export function deuxFacteursRequisPourFacturation(e: {
  plan: 'gratuit' | 'visibilite' | 'premium';
  role: string;
  secondFacteur: boolean;
}): boolean {
  return (
    e.plan === 'premium' && (e.role === 'proprietaire' || e.role === 'gerant') && !e.secondFacteur
  );
}
