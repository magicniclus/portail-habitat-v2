'use client';

import { LIBELLES_STATUT_STUDIO, type StatutProjetStudio } from '@ph/core/studio';
import { Chargeur } from '@ph/ui';

/** Étapes pendant lesquelles Claude ou le robot travaillent sur la vidéo. */
export const OCCUPE: ReadonlySet<StatutProjetStudio> = new Set([
  'transcription',
  'montage',
  'captures',
  'rendu',
]);

/** Par-dessus la frise grisée : ce qui se passe, et quand les outils reviennent. */
export function BandeauOccupe({ statut }: { statut: StatutProjetStudio }) {
  return (
    <div role="status" className="absolute inset-0 grid place-items-center bg-montage-fond/30 p-4">
      <p className="m-0 flex items-center gap-3 rounded-full border border-montage-trait bg-montage-panneau px-5 py-3 text-sm font-semibold shadow-lg">
        <Chargeur taille="sm" decoratif />
        {LIBELLES_STATUT_STUDIO[statut]} en cours : les outils reviennent dès que c’est fini.
      </p>
    </div>
  );
}
