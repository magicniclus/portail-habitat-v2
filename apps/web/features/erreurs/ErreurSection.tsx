'use client';

import { Banner, Button } from '@ph/ui';
import { useEffect, useMemo } from 'react';
import { identifiantIncident } from './incident';

/**
 * Erreur d'une page d'un espace connecté (ALL-04) : le cadre (menu, en-tête) reste en place,
 * l'identifiant d'incident est affiché et envoyé à Sentry, « Réessayer » relance le rendu.
 */
export function ErreurSection({
  erreur,
  reessayer,
}: {
  erreur: Error & { digest?: string };
  reessayer: () => void;
}) {
  const incident = useMemo(() => identifiantIncident(erreur.digest), [erreur.digest]);
  useEffect(() => {
    void import('@sentry/nextjs').then((Sentry) =>
      Sentry.captureException(erreur, { tags: { incident, digest: erreur.digest } }),
    );
  }, [erreur, incident]);
  return (
    <main className="grid gap-4 p-4 sm:p-6">
      <Banner tone="danger" titre="Cette page n’a pas pu s’afficher">
        Réessayez dans un instant. Si le problème continue, donnez ce numéro au support :{' '}
        <strong>{incident}</strong>.
      </Banner>
      <div>
        <Button onClick={reessayer}>Réessayer</Button>
      </div>
    </main>
  );
}
