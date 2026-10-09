import { NextResponse, type NextRequest } from 'next/server';
import { SCRIPT_BANDEAU_COOKIES } from '@/features/cookies/scriptBandeau';
import { doitAfficherMaintenance } from '@/features/erreurs/maintenance';
import { enTetesSecurite, espaceStrict, politiqueContenu } from '@/lib/securite';
import { maintenanceActive } from '@/server/flags';

let empreinte: Promise<string> | undefined;
/** Empreinte du script en ligne du bandeau cookies (seul script fixe des espaces stricts). */
const empreinteBandeau = () =>
  (empreinte ??= crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(SCRIPT_BANDEAU_COOKIES))
    .then((h) => `sha256-${btoa(String.fromCharCode(...new Uint8Array(h)))}`));

const emulateurs = () =>
  [
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
    process.env.FIRESTORE_EMULATOR_HOST,
    process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  ].filter((h): h is string => Boolean(h));

/**
 * En-têtes de sécurité sur chaque réponse (INTEGRATIONS §5) ; maintenance (ERR-03, interrupteur
 * de l'admin ou `MAINTENANCE=1`) : toutes les pages publiques réécrites vers /maintenance, en 503.
 */
export async function proxy(requete: NextRequest) {
  // Poste local et tests (http://localhost, émulateurs) : ni HSTS ni passage forcé en https.
  const local = ['localhost', '127.0.0.1'].includes(requete.nextUrl.hostname);
  const production = process.env.NODE_ENV === 'production' && !local && !emulateurs().length;
  const strict = espaceStrict(requete.nextUrl.pathname);
  const nonce = strict ? btoa(crypto.randomUUID()) : undefined;
  const csp = politiqueContenu({
    production,
    emulateurs: emulateurs(),
    ...(nonce ? { nonce, empreintes: [await empreinteBandeau()] } : {}),
  });
  const entetes = enTetesSecurite({ production, csp });
  let reponse: NextResponse;
  // Admin, API et fichiers ne sont jamais concernés : pas de lecture du flag pour eux.
  if (doitAfficherMaintenance(requete.nextUrl.pathname, true) && (await maintenanceActive()))
    reponse = NextResponse.rewrite(new URL('/maintenance', requete.url), {
      status: 503,
      headers: { 'Retry-After': '600' },
    });
  else if (nonce) {
    // Next.js lit le nonce dans l'en-tête CSP de la requête et l'ajoute à ses propres scripts.
    const h = new Headers(requete.headers);
    h.set('Content-Security-Policy', csp);
    reponse = NextResponse.next({ request: { headers: h } });
  } else reponse = NextResponse.next();
  for (const [k, v] of Object.entries(entetes)) reponse.headers.set(k, v);
  return reponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
