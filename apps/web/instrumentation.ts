import * as Sentry from '@sentry/nextjs';
import { filtrerEvenement } from '@/lib/sentryFiltre';

export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'local',
    tracesSampleRate: 0.05,
    // Jetons de partage retirés des URL (lien /plan/{jeton}).
    beforeSend: filtrerEvenement,
    beforeSendTransaction: filtrerEvenement,
  });
}

export const onRequestError = Sentry.captureRequestError;
