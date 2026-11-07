// Sentry côté navigateur : chargé à la demande pour ne pas peser sur le JavaScript initial
// (budget EXPLOITATION §1). Sans DSN, rien n'est téléchargé.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import('@sentry/nextjs').then((Sentry) =>
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local',
      tracesSampleRate: 0,
    }),
  );
}
