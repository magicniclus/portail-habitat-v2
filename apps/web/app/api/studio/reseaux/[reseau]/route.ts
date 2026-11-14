import { randomBytes } from 'node:crypto';
import { NOMS_RESEAUX, urlAutorisation, type Reseau } from '@ph/core/studio';
import { configReseaux, redirectionReseau } from '@ph/firebase/studio';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_ETAT_RESEAU } from '@/features/studio/etatReseau';
import { pageAdmin } from '@/server/sessionAdmin';

/** Début de connexion d'un réseau : renvoie vers la page d'autorisation du réseau. */
export async function GET(_: Request, { params }: { params: Promise<{ reseau: string }> }) {
  const { reseau } = await params;
  if (!NOMS_RESEAUX.includes(reseau as Reseau)) return new NextResponse(null, { status: 404 });
  const r = reseau as Reseau;
  await pageAdmin(`/admin/studio/reseaux`, 'studio');
  const c = configReseaux(process.env);
  const app = c?.applis[r];
  if (!c || !app)
    return NextResponse.redirect(
      new URL(`/admin/studio/reseaux?manque=${r}`, process.env.NEXT_PUBLIC_SITE_URL ?? _.url),
    );
  const etat = randomBytes(24).toString('base64url');
  (await cookies()).set(COOKIE_ETAT_RESEAU, `${r}.${etat}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/studio/reseaux',
  });
  return NextResponse.redirect(
    urlAutorisation(r, { clientId: app.id, redirection: redirectionReseau(c, r), etat }),
  );
}

export const dynamic = 'force-dynamic';
