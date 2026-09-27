'use client';

import { PageIncident } from '@/features/erreurs/PageIncident';
import './globals.css';

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
