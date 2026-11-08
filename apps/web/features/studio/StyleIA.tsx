'use client';

import { LIBELLES_STYLE_MONTAGE, STYLES_MONTAGE, type StyleMontage } from '@ph/core/studio';
import { Chargeur } from '@ph/ui';
import { useState, useTransition } from 'react';
import { choisirStyle } from './actions';

/** Style du montage de Claude : posé (artisans, par défaut) ou dynamique. */
export function StyleIA({ projetId, style }: { projetId: string; style: StyleMontage }) {
  const [choisi, setChoisi] = useState(style);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid gap-1">
      <div
        role="radiogroup"
        aria-label="Style du montage"
        className="grid grid-cols-2 gap-1 rounded-[10px] bg-montage-surface p-1"
      >
        {STYLES_MONTAGE.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={choisi === x}
            disabled={enCours}
            onClick={() => {
              const avant = choisi;
              setChoisi(x);
              demarrer(async () => {
                setErreur(null);
                const r = await choisirStyle({ projetId, style: x });
                if (!r.ok) {
                  setChoisi(avant);
                  setErreur(r.message);
                }
              });
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] text-sm font-semibold text-montage-texte-doux aria-checked:bg-montage-survol aria-checked:text-montage-selection"
          >
            {enCours && choisi === x ? <Chargeur taille="xs" ton="courant" decoratif /> : null}
            {LIBELLES_STYLE_MONTAGE[x]}
          </button>
        ))}
      </div>
      <p className="m-0 text-xs text-montage-texte-doux">
        {choisi === 'pose'
          ? 'Calme et lisible : écrans dans un appareil, scènes animées, textes qui montent doucement.'
          : 'Plus de rythme : plans courts, zooms et tampons, toujours lisible.'}
      </p>
      {erreur ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
