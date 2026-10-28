import { NextResponse, type NextRequest } from 'next/server';
import { SCRIPT_BANDEAU_COOKIES } from '@/features/cookies/scriptBandeau';
import { doitAfficherMaintenance } from '@/features/erreurs/maintenance';
import { SCRIPT_APERCU } from '@/features/siteArtisan/apercu';
import { SCRIPT_SITE } from '@/features/siteArtisan/document';
import { SCRIPT_EDITION } from '@/features/siteArtisan/edition';
import { hoteSite } from '@/lib/hotesSites';
import { enTetesSecurite, espaceStrict, politiqueContenu, politiqueSite } from '@/lib/securite';
import { maintenanceActive } from '@/server/flags';

const sha256 = (texte: string) =>
  crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(texte))
    .then((h) => `sha256-${btoa(String.fromCharCode(...new Uint8Array(h)))}`);
let empreinte: Promise<string> | undefined;
/** Empreinte du script en ligne du bandeau cookies (seul script fixe des espaces stricts). */
const empreinteBandeau = () => (empreinte ??= sha256(SCRIPT_BANDEAU_COOKIES));
let empreinteS: Promise<string> | undefined;
const empreinteSite = () => (empreinteS ??= sha256(SCRIPT_SITE));
let empreinteE: Promise<string> | undefined;
/** Script de l'aperçu de l'éditeur de site (cadre `srcdoc`, qui hérite de la CSP de la page). */
const empreinteEdition = () => (empreinteE ??= sha256(SCRIPT_EDITION));
let empreinteA: Promise<string> | undefined;
const empreinteApercu = () => (empreinteA ??= sha256(SCRIPT_APERCU));

/** Domaine de la plateforme (les autres hôtes sont des sites artisans). */
const plateforme = () => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portailtravaux.fr').hostname;
  } catch {
    return 'portailtravaux.fr';
  }
};

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
  // Site artisan (sous-domaine ou domaine connecté) : réécrit vers son rendu, hors API du formulaire.
  const site = hoteSite(requete.headers.get('host'), plateforme());
  if (site) {
    const chemin = requete.nextUrl.pathname;
    const reponse =
      chemin.startsWith('/api/sites/') || chemin.startsWith('/polices-sites/')
        ? NextResponse.next()
        : NextResponse.rewrite(new URL(`/s/${site}${chemin === '/' ? '' : chemin}`, requete.url));
    const csp = politiqueSite({ production, empreinte: await empreinteSite() });
    for (const [k, v] of Object.entries(enTetesSecurite({ production, csp, site: true })))
      reponse.headers.set(k, v);
    return reponse;
  }
  // Le rendu des sites n'est jamais servi sur le domaine de la plateforme.
  if (requete.nextUrl.pathname.startsWith('/s/')) return new NextResponse(null, { status: 404 });
  const strict = espaceStrict(requete.nextUrl.pathname);
  const nonce = strict ? btoa(crypto.randomUUID()) : undefined;
  const csp = politiqueContenu({
    production,
    emulateurs: emulateurs(),
    ...(nonce
      ? {
          nonce,
          empreintes: [
            await empreinteBandeau(),
            ...(requete.nextUrl.pathname.startsWith('/pro/site/editeur')
              ? [await empreinteEdition(), await empreinteApercu()]
              : []),
          ],
        }
      : {}),
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
