'use client';

import { BoutonAction } from '@ph/ui';
import { deconnecterAdmin } from './deconnexion';

/** Après l'activation du second facteur : nouvelle connexion, cette fois avec le code. */
export function ReconnexionAdmin() {
  return (
    <BoutonAction variant="secondaire" onClick={() => deconnecterAdmin()}>
      J’ai activé l’application : me reconnecter
    </BoutonAction>
  );
}
