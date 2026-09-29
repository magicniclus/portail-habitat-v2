'use client';

import { Button } from '@ph/ui';

/** La page hors ligne s'affiche à l'adresse demandée : recharger suffit quand le réseau revient. */
export function Reessayer() {
  return (
    <div className="flex justify-center">
      <Button onClick={() => window.location.reload()}>Réessayer</Button>
    </div>
  );
}
