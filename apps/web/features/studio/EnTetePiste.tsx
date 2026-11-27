'use client';

import type { Piste } from '@ph/core/studio';
import {
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  TrashIcon,
} from '@phosphor-icons/react';

/** Largeur de la colonne des en-têtes de pistes (fixe pendant le défilement horizontal). */
export const LARGEUR_EN_TETE = 196;

const BOUTON =
  'flex size-7 shrink-0 items-center justify-center rounded-[6px] text-montage-texte-doux hover:bg-montage-survol hover:text-montage-texte aria-pressed:text-montage-selection';

/**
 * En-tête d'une piste, comme dans les logiciels de montage : nom (modifiable), masquer / couper le
 * son, solo, verrou, volume de la piste et suppression.
 */
export function EnTetePiste({
  piste: p,
  supprimable,
  onChange,
  onSupprimer,
}: {
  piste: Piste;
  supprimable: boolean;
  onChange: (champs: Partial<Pick<Piste, 'nom' | 'muet' | 'solo' | 'verrou' | 'volume'>>) => void;
  onSupprimer: () => void;
}) {
  const image = p.type !== 'audio';
  const Muet = image
    ? p.muet
      ? EyeSlashIcon
      : EyeIcon
    : p.muet
      ? SpeakerSlashIcon
      : SpeakerHighIcon;
  return (
    <div
      className="sticky left-0 z-20 flex h-full shrink-0 flex-col justify-center gap-1 border-r border-montage-trait bg-montage-panneau px-2"
      style={{ width: LARGEUR_EN_TETE }}
    >
      <div className="flex items-center gap-0.5">
        <input
          aria-label="Nom de la piste"
          value={p.nom}
          maxLength={40}
          onChange={(e) => e.target.value.trim() && onChange({ nom: e.target.value })}
          className="min-w-0 flex-1 rounded-[4px] bg-transparent px-1 text-xs font-semibold text-montage-texte outline-none focus-visible:bg-montage-surface"
        />
        <button
          type="button"
          className={BOUTON}
          aria-pressed={p.muet}
          aria-label={`${image ? 'Masquer' : 'Couper le son de'} ${p.nom}`}
          title={image ? 'Masquer la piste' : 'Couper le son'}
          onClick={() => onChange({ muet: !p.muet })}
        >
          <Muet size={15} aria-hidden="true" />
        </button>
        {p.type !== 'texte' ? (
          <button
            type="button"
            className={`${BOUTON} text-[11px] font-bold`}
            aria-pressed={p.solo}
            aria-label={`Solo ${p.nom}`}
            title="Solo : n’écouter que cette piste"
            onClick={() => onChange({ solo: !p.solo })}
          >
            S
          </button>
        ) : null}
        <button
          type="button"
          className={BOUTON}
          aria-pressed={p.verrou}
          aria-label={`Verrouiller ${p.nom}`}
          title="Verrouiller la piste"
          onClick={() => onChange({ verrou: !p.verrou })}
        >
          {p.verrou ? (
            <LockSimpleIcon size={15} aria-hidden="true" />
          ) : (
            <LockSimpleOpenIcon size={15} aria-hidden="true" />
          )}
        </button>
        {supprimable ? (
          <button
            type="button"
            className={BOUTON}
            aria-label={`Supprimer ${p.nom}`}
            title="Supprimer la piste et ses clips"
            onClick={onSupprimer}
          >
            <TrashIcon size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {p.type !== 'texte' ? (
        <label className="flex items-center gap-1.5 px-1 text-[11px] text-montage-texte-doux">
          <span className="sr-only">Volume de {p.nom}</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={p.volume}
            onChange={(e) => onChange({ volume: Number(e.target.value) })}
            className="h-1 min-w-0 flex-1 accent-montage-selection"
          />
          <span className="w-9 text-right tabular-nums">{Math.round(p.volume * 100)} %</span>
        </label>
      ) : null}
    </div>
  );
}
