'use client';

import type { Reseau } from '@ph/core/studio';
import { Button } from '@ph/ui';
import { useTransition } from 'react';
import { deconnecterReseau } from './reseaux';

export function BoutonDeconnexionReseau({ reseau, libelle }: { reseau: Reseau; libelle: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <Button
      variant="fantome"
      disabled={enCours}
      onClick={() => {
        if (!window.confirm(`Déconnecter ${libelle} ? Les publications programmées échoueront.`))
          return;
        demarrer(async () => {
          await deconnecterReseau({ reseau });
        });
      }}
    >
      Déconnecter
    </Button>
  );
}
