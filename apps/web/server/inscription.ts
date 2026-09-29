import 'server-only';
import { lireBrouillonInscription } from '@ph/firebase/comptes';
import { cookies } from 'next/headers';
import { servicesComptes } from './espace';
import { cookieSecurise } from './sessionCookies';

/** Brouillon d'inscription en cours : identifiant en cookie httpOnly (COMPTES §3.2), 30 jours. */
export const COOKIE_INSCRIPTION = 'ph_inscription';
const DUREE_S = 30 * 86_400;

export const optionsCookieInscription = () => ({
  httpOnly: true,
  secure: cookieSecurise(),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: DUREE_S,
});

export async function poserBrouillon(brouillonId: string) {
  (await cookies()).set(COOKIE_INSCRIPTION, brouillonId, optionsCookieInscription());
}

export async function oublierBrouillon() {
  (await cookies()).delete(COOKIE_INSCRIPTION);
}

export async function brouillonCourant() {
  const id = (await cookies()).get(COOKIE_INSCRIPTION)?.value;
  return id && /^[A-Za-z0-9]{10,40}$/.test(id)
    ? lireBrouillonInscription(servicesComptes(), id)
    : null;
}
