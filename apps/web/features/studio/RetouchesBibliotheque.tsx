'use client';

import {
  EFFETS_VIDEO,
  LIBELLES_EFFET_VIDEO,
  LIBELLES_TRANSITION,
  TRANSITIONS,
} from '@ph/core/studio';
import { GLISSE_RETOUCHE, type RetoucheGlissee } from './glisserFrise';

const TUILE =
  'grid min-h-14 content-center justify-items-center rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-center text-xs text-montage-texte hover:border-montage-selection';

/**
 * Transitions (entre deux séquences) ou effets vidéo : glisser la tuile sur un clip, ou cliquer
 * pour l'appliquer au clip choisi. Un effet déjà mis s'enlève d'un second clic.
 */
export function RetouchesBibliotheque(p: {
  genre: RetoucheGlissee['genre'];
  onRetouche: (r: RetoucheGlissee) => void;
}) {
  const liste =
    p.genre === 'transition'
      ? TRANSITIONS.map((type) => ({
          r: { genre: 'transition', type } as RetoucheGlissee,
          libelle: LIBELLES_TRANSITION[type],
        }))
      : EFFETS_VIDEO.map((type) => ({
          r: { genre: 'effet', type } as RetoucheGlissee,
          libelle: LIBELLES_EFFET_VIDEO[type],
        }));
  return (
    <div className="grid gap-2">
      <p className="m-0 text-xs text-montage-texte-doux">
        {p.genre === 'transition'
          ? 'Glissez sur le clip qui suit la coupe : la transition se joue à son début.'
          : 'Glissez sur un clip, ou réglez-les pour toute la piste dans l’onglet Image.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {liste.map(({ r, libelle }) => (
          <button
            key={r.type}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(GLISSE_RETOUCHE, JSON.stringify(r));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => p.onRetouche(r)}
            className={TUILE}
          >
            {libelle}
          </button>
        ))}
      </div>
    </div>
  );
}
