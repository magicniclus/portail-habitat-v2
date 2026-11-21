import { timingSafeEqual } from 'node:crypto';
import { NOMS_RESEAUX, type Reseau } from '@ph/core/studio';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_ETAT_RESEAU } from '@/features/studio/etatReseau';
import { connecterReseau } from '@/features/studio/reseaux';
import { pageAdmin } from '@/server/sessionAdmin';

const egal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Retour d'autorisation : vérifie l'état, échange le code, revient à la page des réseaux. */
export async function GET(req: Request, { params }: { params: Promise<{ reseau: string }> }) {
  const { reseau } = await params;
  if (!NOMS_RESEAUX.includes(reseau as Reseau)) return new NextResponse(null, { status: 404 });
  await pageAdmin('/admin/studio/reseaux', 'studio');
  const u = new URL(req.url);
  const vers = (q: string) =>
    NextResponse.redirect(
      new URL(`/admin/studio/reseaux?${q}`, process.env.NEXT_PUBLIC_SITE_URL ?? req.url),
    );
  const pot = await cookies();
  const attendu = pot.get(COOKIE_ETAT_RESEAU)?.value ?? '';
  pot.delete({ name: COOKIE_ETAT_RESEAU, path: '/api/studio/reseaux' });
  const code = u.searchParams.get('code');
  const etat = u.searchParams.get('state') ?? '';
  if (!code) return vers(`refus=${reseau}`);
  if (!attendu || !egal(attendu, `${reseau}.${etat}`)) return vers(`erreur=${reseau}`);
  const r = await connecterReseau({ reseau: reseau as Reseau, code });
  return vers(r.ok ? `connecte=${reseau}` : `erreur=${reseau}`);
}

export const dynamic = 'force-dynamic';
