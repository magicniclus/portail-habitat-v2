'use client';

import { Banner } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { posterJson } from '@/lib/posterJson';

/** Bascule d'entreprise (COMPTES §4.5), visible seulement avec plusieurs entreprises. Select natif (MOBILE §4). */
export function SelecteurEntreprise({
  entreprises,
  activeId,
}: {
  entreprises: { artisanId: string; nomCommercial: string }[];
  activeId: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  if (entreprises.length < 2) return null;

  const choisir = (artisanId: string) =>
    demarrer(async () => {
      setErreur(null);
      const r = await posterJson<null>('/api/pro/entreprise-active', { artisanId });
      if (!r.ok) return setErreur(r.message);
      router.refresh();
    });

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-neutre-700">
        Entreprise
      </label>
      <select
        id={id}
        value={activeId ?? ''}
        disabled={enCours}
        onChange={(e) => choisir(e.target.value)}
        className="min-h-11 w-full cursor-pointer rounded-md border border-trait bg-blanc px-3 text-base font-semibold"
      >
        {activeId ? null : <option value="">Choisissez une entreprise</option>}
        {entreprises.map((e) => (
          <option key={e.artisanId} value={e.artisanId}>
            {e.nomCommercial}
          </option>
        ))}
      </select>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
