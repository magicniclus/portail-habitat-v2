import 'server-only';
import { lireBrouillonInscription } from '@ph/firebase/comptes';
import { cookies } from 'next/headers';
import { servicesComptes } from './espace';

/** Brouillon d'inscription en cours : identifiant en cookie httpOnly (COMPTES §3.2), 30 jours. */
export const COOKIE_INSCRIPTION = 'ph_inscription';
const DUREE_S = 30 * 86_400;

export async function poserBrouillon(brouillonId: string) {
  (await cookies()).set(COOKIE_INSCRIPTION, brouillonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_S,
  });
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
