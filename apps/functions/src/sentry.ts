import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.GCLOUD_PROJECT,
    tracesSampleRate: 0.05,
  });
}

export function signalerErreur(erreur: unknown): void {
  if (dsn) Sentry.captureException(erreur);
  else console.error(erreur);
}
