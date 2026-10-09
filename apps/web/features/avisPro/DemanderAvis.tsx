'use client';

import { Button, Feuille } from '@ph/ui';
import { useState } from 'react';
import { routes } from '@/lib/routes';

/** « Demander un avis » : lien de la page publique à envoyer au client (copie en un clic). */
export function DemanderAvis() {
  const [copie, setCopie] = useState(false);
  const lien = () => `${window.location.origin}${routes.avis}`;
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien());
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };
  return (
    <Feuille
      titre="Demander un avis"
      declencheur={<Button variant="secondaire">Demander un avis</Button>}
      description="Envoyez ce lien à votre client : il choisit votre entreprise et laisse son avis, vérifié avant publication."
      actions={
        <Button onClick={() => void copier()}>{copie ? 'Lien copié' : 'Copier le lien'}</Button>
      }
    >
      <p className="m-0 rounded-md bg-neutre-100 p-3 text-sm break-all">
        {typeof window === 'undefined' ? routes.avis : lien()}
      </p>
    </Feuille>
  );
}
