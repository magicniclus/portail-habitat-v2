import { desabonner } from '@ph/firebase/notifications';
import { NextResponse } from 'next/server';
import { lireJeton, servicesNotifications } from '@/server/notifications';

export const dynamic = 'force-dynamic';

/**
 * Désabonnement en un clic (RFC 8058, obligatoire pour Gmail et Yahoo) : le client de messagerie
 * envoie un POST sans cookie ni page. Coupe seulement la catégorie du lien.
 */
export async function POST(requete: Request) {
  const jeton = lireJeton(new URL(requete.url).searchParams.get('t'));
  if (!jeton) return new Response(null, { status: 400 });
  await desabonner(servicesNotifications(), jeton);
  return new Response(null, { status: 200 });
}

/** Lien cliqué dans l'email : même effet, puis la page des préférences confirme. */
export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const t = url.searchParams.get('t');
  const jeton = lireJeton(t);
  if (!jeton) return NextResponse.redirect(new URL('/preferences?erreur=lien', url));
  await desabonner(servicesNotifications(), jeton);
  return NextResponse.redirect(
    new URL(`/preferences?t=${encodeURIComponent(t!)}&desabonne=${jeton.categorie ?? ''}`, url),
  );
}
