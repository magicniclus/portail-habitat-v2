'use client';

import type { LigneSousTitre } from '@ph/core/studio';
import { SubtitlesIcon } from '@phosphor-icons/react';
import { LARGEUR_EN_TETE } from './EnTetePiste';

/** Identifiant de sélection de la piste des sous-titres. */
export const SELECTION_SOUS_TITRES = '__sous-titres';

/**
 * Piste des sous-titres (une ligne par phrase courte) : la choisir ouvre leur réglage à droite
 * (texte, position) et permet de les déplacer sur l'image.
 */
export function LigneSousTitres(p: {
  lignes: readonly LigneSousTitre[];
  actifs: boolean;
  px: number;
  largeur: number;
  selectionne: boolean;
  onSelection: () => void;
}) {
  return (
    <div className="flex h-9 border-b border-montage-trait">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-montage-trait bg-montage-panneau px-3 text-xs font-semibold"
        style={{ width: LARGEUR_EN_TETE }}
      >
        <SubtitlesIcon size={15} aria-hidden="true" />
        Sous-titres{p.actifs ? '' : ' (masqués)'}
      </div>
      <button
        type="button"
        aria-pressed={p.selectionne}
        aria-label="Piste des sous-titres"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={p.onSelection}
        className={`relative block text-left ${p.selectionne ? 'bg-montage-survol' : 'bg-montage-fond/60'}`}
        style={{ width: p.largeur }}
      >
        {p.lignes.map((l) => (
          <span
            key={l.debut}
            className={`absolute top-1 bottom-1 truncate rounded-[4px] px-1 text-[10px] leading-6 ${p.actifs ? 'bg-montage-piste-sous-titres' : 'bg-montage-surface opacity-50'}`}
            style={{ left: l.debut * p.px, width: Math.max(4, (l.fin - l.debut) * p.px - 1) }}
          >
            {l.mots.map((m) => m.texte).join(' ')}
          </span>
        ))}
      </button>
    </div>
  );
}
