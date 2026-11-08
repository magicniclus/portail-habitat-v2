'use client';

import type { Frise, MotTranscrit } from '@ph/core/studio';
import { Button } from '@ph/ui';
import { useState } from 'react';
import { EditeurFrise } from './EditeurFrise';
import type { FichiersProjet } from './sourcesFrise';

/**
 * Montage : l'éditeur multipistes s'ouvre en plein écran (montage libre, ou montage de Claude
 * converti en pistes) ; fermé, la page de l'étape (suivi de la fabrication) permet de le
 * rouvrir.
 */
export function EtapeMontage(p: {
  projetId: string;
  frise: Frise;
  fichiers: FichiersProjet;
  mots: MotTranscrit[];
  retouche: boolean;
  etat: string | null;
  projets: readonly { id: string; titre: string }[];
}) {
  const [ouvert, setOuvert] = useState(true);
  const clips = p.frise.pistes.reduce((n, x) => n + x.clips.length, 0);
  return (
    <section
      aria-labelledby="montage-libre"
      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <div className="min-w-0">
        <h2 id="montage-libre" className="m-0 text-lg">
          Montage · {p.frise.titre}
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          {p.frise.pistes.length} pistes · {clips} clips · {p.frise.medias.length} médias
        </p>
      </div>
      <Button onClick={() => setOuvert(true)}>Ouvrir l’éditeur</Button>
      {ouvert ? <EditeurFrise {...p} onFermer={() => setOuvert(false)} /> : null}
    </section>
  );
}
