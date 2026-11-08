'use client';

import { modifierPiste, type Frise } from '@ph/core/studio';
import { SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react';

const BOUTON =
  'flex size-9 items-center justify-center rounded-[6px] border border-montage-trait text-xs font-bold aria-pressed:border-montage-selection aria-pressed:bg-montage-selection aria-pressed:text-montage-fond';

/**
 * Table de mixage : une tranche par piste qui fait du son (vidéo et audio) avec son volume
 * (0 à 200 %), muet et solo ; les mêmes réglages qu'à gauche des pistes, réunis.
 */
export function Mixage({ frise: f, changer }: { frise: Frise; changer: (f: Frise) => void }) {
  const pistes = f.pistes.filter((p) => p.type !== 'texte');
  return (
    <div className="grid gap-2">
      <p className="m-0 text-xs text-montage-texte-doux">
        Volume de chaque piste ; « S » n’écoute que les pistes en solo. Double-clic : 100 %.
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {pistes.map((p) => (
          <div
            key={p.id}
            className="grid w-16 shrink-0 justify-items-center gap-2 rounded-[8px] bg-montage-surface p-2"
          >
            <span className="w-full truncate text-center text-[11px] font-semibold">{p.nom}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={p.volume}
              aria-label={`Volume de ${p.nom}`}
              onChange={(e) => changer(modifierPiste(f, p.id, { volume: Number(e.target.value) }))}
              onDoubleClick={() => changer(modifierPiste(f, p.id, { volume: 1 }))}
              className="h-32 accent-montage-selection [writing-mode:vertical-lr] [direction:rtl]"
            />
            <span className="text-[11px] tabular-nums">{Math.round(p.volume * 100)} %</span>
            <button
              type="button"
              className={BOUTON}
              aria-pressed={p.muet}
              aria-label={`Muet ${p.nom}`}
              onClick={() => changer(modifierPiste(f, p.id, { muet: !p.muet }))}
            >
              {p.muet ? (
                <SpeakerSlashIcon size={16} aria-hidden="true" />
              ) : (
                <SpeakerHighIcon size={16} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={BOUTON}
              aria-pressed={p.solo}
              aria-label={`Solo ${p.nom} (mixage)`}
              onClick={() => changer(modifierPiste(f, p.id, { solo: !p.solo }))}
            >
              S
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
