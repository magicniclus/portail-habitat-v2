'use client';

import { tempsMontage } from '@ph/core/studio';
import {
  ArrowsOutIcon,
  ImageSquareIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
} from '@phosphor-icons/react';
import type { Horloge } from './useLectureMontage';

const BOUTON =
  'flex size-11 items-center justify-center rounded-[8px] text-montage-texte hover:bg-montage-survol aria-pressed:bg-montage-survol aria-pressed:text-montage-selection';

/** Sous l'aperçu : compteur, lecture (Espace), retour au début, miniature, plein écran. */
export function CommandesLecture({
  lecture: l,
  miniature,
  onMiniature,
  avecMiniature,
  onPleinEcran,
}: {
  lecture: Horloge;
  miniature: boolean;
  onMiniature: (voir: boolean) => void;
  avecMiniature: boolean;
  onPleinEcran: () => void;
}) {
  const lire = () =>
    l.affiche >= l.duree ? (l.aller(0), l.setLecture(true)) : l.setLecture(!l.lecture);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
      <p className="m-0 font-mono text-sm tabular-nums">
        <span className="text-montage-selection">{tempsMontage(l.affiche)}</span>
        <span className="text-montage-texte-doux"> / {tempsMontage(l.duree)}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={BOUTON}
          onClick={() => l.aller(0)}
          aria-label="Revenir au début"
        >
          <SkipBackIcon aria-hidden="true" size={18} weight="fill" />
        </button>
        <button
          type="button"
          className={`${BOUTON} bg-montage-surface`}
          onClick={lire}
          aria-label={l.lecture ? 'Pause (Espace)' : 'Lire (Espace)'}
        >
          {l.lecture ? (
            <PauseIcon aria-hidden="true" size={20} weight="fill" />
          ) : (
            <PlayIcon aria-hidden="true" size={20} weight="fill" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-end gap-1">
        {avecMiniature ? (
          <button
            type="button"
            className={BOUTON}
            aria-pressed={miniature}
            onClick={() => {
              if (!miniature) l.setLecture(false);
              onMiniature(!miniature);
            }}
            aria-label="Voir la miniature"
            title="Voir la miniature"
          >
            <ImageSquareIcon aria-hidden="true" size={20} />
          </button>
        ) : null}
        <button
          type="button"
          className={BOUTON}
          onClick={onPleinEcran}
          aria-label="Aperçu en plein écran"
          title="Aperçu en plein écran"
        >
          <ArrowsOutIcon aria-hidden="true" size={20} />
        </button>
      </div>
    </div>
  );
}
