'use client';

import { CALQUES_COMPORTEMENT, type CalqueComportement } from '@ph/core/comportement';
import { Chip } from '@ph/ui';
import { useState, type ReactNode } from 'react';
import { ApercuPage } from './ApercuPage';
import { CanevasChaleur } from './CanevasChaleur';
import { ListesComportement } from './ListesComportement';
import { Superpositions } from './Superpositions';
import type { DonneesCartes } from './types';

/** Onglet « Cartes et frictions » : page réelle, calques réglables, listes qui surlignent. */
export function EcranCartes({
  chemin,
  largeur,
  donnees,
  panneau,
}: {
  chemin: string;
  largeur: number;
  donnees: DonneesCartes;
  panneau: ReactNode;
}) {
  const [calque, setCalque] = useState<CalqueComportement>('clics');
  const [opacite, setOpacite] = useState(0.8);
  const [surligne, setSurligne] = useState<string | null>(null);
  const legende = CALQUES_COMPORTEMENT.find((c) => c.id === calque)!.legende;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Calques">
          {CALQUES_COMPORTEMENT.map((c) => (
            <Chip key={c.id} selectionne={calque === c.id} onClick={() => setCalque(c.id)}>
              {c.nom}
            </Chip>
          ))}
          <label className="ml-auto flex min-h-11 items-center gap-1.5 text-sm text-neutre-800">
            Opacité
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={opacite}
              onChange={(e) => setOpacite(Number(e.target.value))}
              className="w-24 accent-accent"
            />
          </label>
        </div>
        <p className="m-0 text-sm text-neutre-700">{legende}</p>
        <ApercuPage
          chemin={chemin}
          largeur={largeur}
          calques={(m) => (
            <>
              <CanevasChaleur
                calque={calque}
                donnees={donnees}
                largeur={largeur}
                hauteur={m.hauteur}
                opacite={opacite}
              />
              <Superpositions
                calque={calque}
                donnees={donnees}
                doc={m.doc}
                largeur={largeur}
                hauteur={m.hauteur}
                echelle={m.echelle}
                surligne={surligne}
              />
            </>
          )}
        />
      </div>
      <aside className="flex min-w-0 flex-col gap-3">
        {panneau}
        <ListesComportement donnees={donnees} onSurligne={setSurligne} />
      </aside>
    </div>
  );
}
