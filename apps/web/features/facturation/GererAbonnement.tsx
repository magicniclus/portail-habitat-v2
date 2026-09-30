'use client';

import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** « Gérer mon abonnement » : portail client Stripe (carte, factures, résiliation). */
export function GererAbonnement() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const ouvrir = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<{ url: string }>('/api/pro/abonnement/portail', {});
    if (!r.ok) {
      setEnCours(false);
      return setErreur(r.message);
    }
    window.location.assign(r.data.url);
  };
  return (
    <div className="grid gap-2">
      <Button variant="secondaire" onClick={ouvrir} disabled={enCours}>
        {enCours ? 'Ouverture…' : 'Gérer mon abonnement'}
      </Button>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
