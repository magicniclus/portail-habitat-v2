'use client';

import { LIBELLES_STYLE_MONTAGE, STYLES_MONTAGE, type StyleMontage } from '@ph/core/studio';
import { Chargeur } from '@ph/ui';
import { useState, useTransition } from 'react';
import { choisirStyle } from './actions';

/** Style du montage de Claude : écran filmé (par défaut), animé posé ou animé rythmé. */
export function StyleIA({ projetId, style }: { projetId: string; style: StyleMontage }) {
  const [choisi, setChoisi] = useState(style);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid gap-1">
      <div
        role="radiogroup"
        aria-label="Style du montage"
        className="grid grid-cols-3 gap-1 rounded-[10px] bg-montage-surface p-1"
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
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] px-1 text-center text-xs font-semibold leading-tight text-montage-texte-doux aria-checked:bg-montage-survol aria-checked:text-montage-selection"
          >
            {enCours && choisi === x ? <Chargeur taille="xs" ton="courant" decoratif /> : null}
            {LIBELLES_STYLE_MONTAGE[x]}
          </button>
        ))}
      </div>
      <p className="m-0 text-xs text-montage-texte-doux">
        {
          {
            ecran:
              'Simple : l’écran de Portail Travaux filmé (fiche, devis… selon le thème), une intro, une fin et quelques textes. Rien de plus.',
            pose: 'Animé posé : écrans dans un appareil, scènes animées, textes qui montent doucement.',
            dynamique: 'Animé rythmé : plans courts, zooms et tampons, toujours lisible.',
          }[choisi]
        }
      </p>
      {erreur ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
