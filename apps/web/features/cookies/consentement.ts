'use client';

import {
  COOKIE_CONSENTEMENT,
  DUREE_CONSENTEMENT_MS,
  ecrireConsentement,
  lireConsentement,
} from '@ph/core/consentement';

/** Événement émis à chaque choix : les traceurs soumis au consentement l'écoutent (COMPORTEMENT §7). */
export const EVENEMENT_CONSENTEMENT = 'ph:consentement';
/** Événement qui rouvre le choix (lien « Gérer les cookies »). */
export const EVENEMENT_OUVRIR = 'ph:cookies-ouvrir';

const valeurCookie = () =>
  document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_CONSENTEMENT}=`))
    ?.slice(COOKIE_CONSENTEMENT.length + 1);

export const consentementActuel = () => lireConsentement(valeurCookie(), Date.now());

export function enregistrerConsentement(audienceDetaillee: boolean) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_CONSENTEMENT}=${ecrireConsentement({ audienceDetaillee }, Date.now())}; Max-Age=${DUREE_CONSENTEMENT_MS / 1000}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENEMENT_CONSENTEMENT));
}
