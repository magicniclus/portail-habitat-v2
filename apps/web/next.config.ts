import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

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
