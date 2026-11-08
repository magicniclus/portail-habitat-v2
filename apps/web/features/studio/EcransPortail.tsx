'use client';

import { NOMS_SCENES, SCENES_CAPTURE, type SceneCapture } from '@ph/core/studio';

/**
 * Écrans de Portail Travaux filmés par le robot sur la copie isolée (artisan d'exemple) : un
 * clic pose l'écran à la tête de lecture ; s'il n'est pas encore filmé, il le sera à la
 * fabrication.
 */
export function EcransPortail(p: {
  filmees: ReadonlySet<SceneCapture>;
  onEcran: (scene: SceneCapture) => void;
}) {
  return (
    <div className="grid gap-2">
      <h3 className="m-0 mt-2 text-xs font-semibold text-montage-texte-doux">
        Écrans de Portail Travaux
      </h3>
      {NOMS_SCENES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => p.onEcran(s)}
          className="grid min-h-14 content-center gap-1 rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-left text-xs text-montage-texte hover:border-montage-selection"
        >
          <span className="font-semibold">{SCENES_CAPTURE[s].libelle}</span>
          <span className="text-montage-texte-doux">
            {p.filmees.has(s) ? 'Filmée' : 'Filmée à la fabrication'}
          </span>
        </button>
      ))}
    </div>
  );
}
