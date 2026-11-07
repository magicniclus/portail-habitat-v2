'use client';

import type { MotTranscrit, PlanMontage } from '@ph/core/studio';
import { Button } from '@ph/ui';
import { useState } from 'react';
import { EditeurMontage } from './EditeurMontage';

/**
 * Montage : l'éditeur s'ouvre en plein écran dès qu'un montage existe. Fermé, on retrouve la
 * page de l'étape (suivi de la fabrication) avec de quoi le rouvrir.
 */
export function EtapeMontage(p: {
  projetId: string;
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix?: string };
  captures: Record<string, string>;
  mots: MotTranscrit[];
  camera: boolean;
  dureePriseMs: number;
  /** Version du plan : une nouvelle version repart d'un brouillon propre. */
  version: number;
  /** Où en est le projet (fabrication en cours…), affiché dans la barre de l'éditeur. */
  etat: string | null;
}) {
  const [ouvert, setOuvert] = useState(true);
  return (
    <section
      aria-labelledby="montage-studio"
      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <div className="min-w-0">
        <h2 id="montage-studio" className="m-0 text-lg">
          Montage · {p.plan.titre}
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          {p.plan.plans.length} plans · éditeur plein écran (frise, effets, sous-titres).
        </p>
      </div>
      <Button onClick={() => setOuvert(true)}>Ouvrir l’éditeur</Button>
      {ouvert ? <EditeurMontage key={p.version} {...p} onFermer={() => setOuvert(false)} /> : null}
    </section>
  );
}
