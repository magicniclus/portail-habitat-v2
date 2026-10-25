import { withSentryConfig } from '@sentry/nextjs/config';
import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

/** Photo du hero de /pro : référencée seulement si le fichier est présent au build (sinon 404). */
const PHOTO_HERO_PRO = '/landing/photos/hero-acquisition.webp';

const config: NextConfig = {
  poweredByHeader: false,
  env: {
    PHOTO_HERO_PRO: existsSync(new URL(`./public${PHOTO_HERO_PRO}`, import.meta.url))
      ? PHOTO_HERO_PRO
      : '',
  },
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
  },
  // Aperçu d'une fiche par son artisan (`?apercu=1`) : jamais indexé, la page reste statique (ISR).
  async headers() {
    return [
      {
        source: '/artisans/:slug',
        has: [{ type: 'query', key: 'apercu' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
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
