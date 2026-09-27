import { NextResponse, type NextRequest } from 'next/server';
import { doitAfficherMaintenance } from '@/features/erreurs/maintenance';

/** Maintenance (ERR-03) : réécrit toutes les pages publiques vers /maintenance, en 503. */
export function proxy(requete: NextRequest) {
  if (!doitAfficherMaintenance(requete.nextUrl.pathname, process.env.MAINTENANCE === '1')) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL('/maintenance', requete.url), {
    status: 503,
    headers: { 'Retry-After': '600' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
