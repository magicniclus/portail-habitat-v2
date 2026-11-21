'use client';

import { Button, PageErreur } from '@ph/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EnteteErreur, PiedErreur } from './Cadre';
import { ESPACES_ERREUR, type EspacePublic } from './espaces';
import { identifiantIncident } from './incident';

interface Props {
  erreur: Error & { digest?: string };
  reessayer: () => void;
  espace?: EspacePublic;
}

/** 500 : identifiant d'incident affiché ET envoyé à Sentry en étiquette `incident` (ERR-02). */
export function PageIncident({ erreur, reessayer, espace = 'particulier' }: Props) {
  const incident = useMemo(() => identifiantIncident(erreur.digest), [erreur.digest]);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    // Chargé seulement quand une erreur survient (poids du JavaScript initial).
    void import('@sentry/nextjs').then((Sentry) =>
      Sentry.captureException(erreur, { tags: { incident, digest: erreur.digest } }),
    );
  }, [erreur, incident]);

  return (
    <PageErreur
      surtitre="Erreur 500"
      titre="Un souci technique de"
      motCle="notre côté."
      texte="Ce n’est pas de votre faute. Notre équipe a été prévenue automatiquement. Réessayez dans quelques instants ; si le problème continue, contactez-nous avec l’identifiant ci-dessous."
      visuel="500"
      entete={<EnteteErreur espace={espace} />}
      pied={<PiedErreur espace={espace} />}
      complement={
        <div className="flex flex-col gap-1.5 rounded-card bg-neutre-100 px-4 py-3.5">
          <span className="text-sm text-neutre-700">
            Identifiant de l’incident, à communiquer au support
          </span>
          <span className="flex flex-wrap items-center gap-2.5">
            <code className="font-mono text-base font-bold" data-testid="incident">
              {incident}
            </code>
            <Button
              variant="fantome"
              taille="sm"
              onClick={async () => {
                await navigator.clipboard?.writeText(incident);
                setCopie(true);
              }}
            >
              {copie ? 'Copié' : 'Copier'}
            </Button>
          </span>
        </div>
      }
      actions={
        <>
          <Button taille="lg" onClick={reessayer}>
            Réessayer
          </Button>
          <Button asChild taille="lg" variant="secondaire">
            <Link prefetch={false} href={ESPACES_ERREUR[espace].aide}>
              Contacter le support
            </Link>
          </Button>
        </>
      }
    />
  );
}
