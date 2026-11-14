'use client';

import dynamic from 'next/dynamic';
import './globals.css';

const PageIncident = dynamic(() =>
  import('@/features/erreurs/PageIncident').then((m) => m.PageIncident),
);

// Erreur dans le layout racine lui-même : la page doit fournir <html> et <body>.
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <PageIncident erreur={error} reessayer={reset} />
      </body>
    </html>
  );
}
