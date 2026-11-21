'use client';

import type { Frise } from '@ph/core/studio';
import { useState } from 'react';
import { Mixage } from './Mixage';
import { ReglagesProjet } from './ReglagesProjet';

/** Sans clip choisi : la vidéo entière en deux onglets, Contenu (réglages) et Mixage. */
export function PanneauVideo(p: { frise: Frise; tete: number; changer: (f: Frise) => void }) {
  const [onglet, setOnglet] = useState<'contenu' | 'mixage'>('contenu');
  return (
    <div className="grid gap-3">
      <div
        role="tablist"
        aria-label="Toute la vidéo"
        className="flex gap-1 rounded-[8px] bg-montage-fond p-1"
      >
        {(
          [
            ['contenu', 'Contenu'],
            ['mixage', 'Mixage'],
          ] as const
        ).map(([id, libelle]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={onglet === id}
            onClick={() => setOnglet(id)}
            className="min-h-9 flex-1 rounded-[6px] text-sm text-montage-texte-doux aria-selected:bg-montage-surface aria-selected:text-montage-texte"
          >
            {libelle}
          </button>
        ))}
      </div>
      {onglet === 'contenu' ? (
        <ReglagesProjet {...p} />
      ) : (
        <Mixage frise={p.frise} changer={p.changer} />
      )}
    </div>
  );
}
