'use client';

import { Button } from '@ph/ui';
import { deconnecterAdmin } from './deconnexion';

/** Après l'activation du second facteur : nouvelle connexion, cette fois avec le code. */
export function ReconnexionAdmin() {
  return (
    <Button variant="secondaire" onClick={() => void deconnecterAdmin()}>
      J’ai activé l’application : me reconnecter
    </Button>
  );
}
