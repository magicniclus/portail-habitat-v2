import { entreeRepriseInscription } from '@ph/core/schemas';
import { lireBrouillonInscription, reprendreInscription } from '@ph/firebase/comptes';
import { NextResponse } from 'next/server';
import { servicesComptes } from '@/server/espace';
import { COOKIE_INSCRIPTION } from '@/server/inscription';

export const dynamic = 'force-dynamic';

/**
 * Lien reçu par email (`/pro/inscription?reprise=<jeton>`, ONB-04) : le brouillon est rattaché à
 * ce navigateur (cookie httpOnly) et l'inscription reprend à l'étape enregistrée.
 */
export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const p = entreeRepriseInscription.safeParse({ jeton: url.searchParams.get('reprise') ?? '' });
  const s = servicesComptes();
  const id = p.success ? await reprendreInscription(s, p.data.jeton) : null;
  const b = id ? await lireBrouillonInscription(s, id) : null;
  if (!b) return NextResponse.redirect(new URL('/pro?reprise=expiree#inscription', url), 303);
  const r = NextResponse.redirect(
    new URL(b.etape === 3 ? '/pro/inscription/compte' : '/pro/inscription/zone', url),
    303,
  );
  r.cookies.set(COOKIE_INSCRIPTION, b.brouillonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 86_400,
  });
  // Le jeton ne doit pas fuiter vers d'autres sites par l'en-tête Referer.
  r.headers.set('Referrer-Policy', 'no-referrer');
  return r;
}
