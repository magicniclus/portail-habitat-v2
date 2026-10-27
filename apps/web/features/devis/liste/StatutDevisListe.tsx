'use client';

import {
  libelleStatutDevis,
  statutsPossibles,
  tonStatut,
  type StatutDevisManuel,
} from '@ph/core/devis';
import { Badge, cn } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

const TON: Record<ReturnType<typeof tonStatut>, string> = {
  neutre: 'border-trait bg-neutre-100 text-neutre-900',
  info: 'border-info/40 bg-info-fond text-info',
  succes: 'border-succes/40 bg-succes-fond text-succes',
  danger: 'border-danger/40 bg-danger-fond text-danger',
  attention: 'border-attention/40 bg-attention-fond text-attention',
};

/** Statut d'un devis dans la liste (capture) : menu natif quand un changement est possible. */
export function StatutDevisListe({
  devisId,
  numero,
  statut,
  peutGerer,
  envoye,
}: {
  devisId: string;
  numero: string;
  statut: string;
  peutGerer: boolean;
  envoye: boolean;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const choix = peutGerer ? statutsPossibles(statut) : [];
  if (!choix.length)
    return <Badge tone={tonStatut(statut)}>{libelleStatutDevis(statut, envoye)}</Badge>;
  return (
    <span className="grid gap-0.5">
      <select
        aria-label={`Statut du devis ${numero || 'brouillon'}`}
        value={statut}
        disabled={enCours}
        onChange={async (x) => {
          setEnCours(true);
          setErreur(null);
          const r = await posterJson<null>('/api/pro/devis/statut', {
            devisId,
            statut: x.target.value as StatutDevisManuel,
          });
          setEnCours(false);
          if (!r.ok) return setErreur(r.message);
          router.refresh();
        }}
        className={cn(
          'min-h-11 w-fit cursor-pointer rounded-pill border px-3 text-base font-semibold',
          TON[tonStatut(statut)],
        )}
      >
        <option value={statut}>{libelleStatutDevis(statut, envoye)}</option>
        {choix.map((s) => (
          <option key={s} value={s}>
            {libelleStatutDevis(s, true)}
          </option>
        ))}
      </select>
      {erreur ? (
        <span role="alert" className="text-xs text-danger">
          {erreur}
        </span>
      ) : null}
    </span>
  );
}
