import { withSentryConfig } from '@sentry/nextjs/config';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

/**
 * `.env.local` de la racine du dépôt (README : `cp .env.example .env.local`) : Next.js, lancé dans
 * `apps/web`, ne lit que celui de `apps/web`. Ses valeurs complètent l'environnement sans jamais
 * écraser une variable déjà définie (Vercel, `apps/web/.env.local`, terminal).
 */
function envRacine() {
  const fichier = resolve(process.cwd(), '../../.env.local');
  if (!existsSync(fichier)) return;
  for (const ligne of readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(ligne);
    if (!m || process.env[m[1]!] !== undefined) continue;
    process.env[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
  }
}
envRacine();

const config: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  transpilePackages: ['@ph/core', '@ph/emails', '@ph/firebase', '@ph/tracker', '@ph/ui'],
  // pdfkit lit ses polices standard sur le disque : jamais empaqueté (PDF des devis, lot 11b).
  serverExternalPackages: ['firebase-admin', 'pdfkit'],
  // Index de @ph/ui : n'importer que les modules utilisés (sinon tout le paquet, tailwind-merge
  // compris, est exécuté sur chaque page par le bandeau cookies ; budget D46).
  experimental: {
    optimizePackageImports: ['@ph/ui', '@ph/core'],
    // forbidden() : vraie réponse 403 pour une section admin hors permissions (ADM-01).
    authInterrupts: true,
    // Pas de cache disque Turbopack en dev : sous Windows, il gardait un CSS Tailwind périmé
    // (classes nouvelles absentes) même après un redémarrage.
    turbopackFileSystemCacheForDev: false,
  },
  // Aperçu d'une fiche par son artisan (`?apercu=1`) : jamais indexé, la page reste statique (ISR).
  async headers() {
    return [
      {
        source: '/artisans/:slug',
        has: [{ type: 'query', key: 'apercu' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        // Polices des sites artisans : aussi chargées par l'aperçu de l'éditeur (cadre isolé,
        // origine opaque), d'où l'accès partagé ; fichiers publics et immuables.
        source: '/polices-sites/:fichier*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Sans jeton (local, aperçus), les sourcemaps ne sont simplement pas envoyées.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
});
