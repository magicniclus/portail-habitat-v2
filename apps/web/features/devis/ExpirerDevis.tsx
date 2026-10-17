'use client';

import { Banner, Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/**
 * « Marquer expirés » (maquette Devis et Factures) : devis envoyés dont la validité est passée,
 * sans attendre le passage automatique du matin.
 */
export function ExpirerDevis({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const expirer = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<{ faits: string[] }>('/api/pro/devis/expirer', { ids });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[15px]">
        {ids.length} devis envoyé{ids.length > 1 ? 's' : ''} hors validité.
      </span>
      <Button variant="secondaire" disabled={enCours} onClick={() => void expirer()}>
        Marquer expirés
      </Button>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
