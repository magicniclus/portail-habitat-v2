import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  transpilePackages: ['@ph/core', '@ph/firebase'],
  serverExternalPackages: ['firebase-admin'],
};

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Sans jeton (local, aperçus), les sourcemaps ne sont simplement pas envoyées.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
});
