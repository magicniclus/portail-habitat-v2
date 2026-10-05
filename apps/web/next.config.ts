import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  transpilePackages: ['@ph/core', '@ph/firebase', '@ph/tracker', '@ph/ui'],
  serverExternalPackages: ['firebase-admin'],
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
