'use client';

import { ImportVideo } from './ImportVideo';
import { PrompteurDefilant } from './PrompteurDefilant';
import type { VideoATourner } from './SessionTournage';

/**
 * Session tournée d'une traite au téléphone (en voiture, au calme) : tous les scripts défilent à
 * la suite, on filme une seule vidéo, puis le Studio la découpe et Claude monte chaque vidéo.
 */
export function SessionUnePrise(p: { videos: VideoATourner[]; onEnvoye: () => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
      <PrompteurDefilant parties={p.videos.map((v) => ({ titre: v.titre, script: v.script }))} />
      <div className="grid content-start gap-2">
        <p className="m-0 text-sm text-neutre-700">
          Lancez une seule vidéo au téléphone (vertical, face à vous) et lisez les {p.videos.length}{' '}
          scripts à la suite, dans l’ordre. Marquez une petite pause entre deux vidéos ; un raté ?
          Reprenez simplement la phrase : le meilleur essai est gardé. 15 minutes au plus, soit
          environ 10 vidéos courtes.
        </p>
        <ImportVideo
          projetId={p.videos[0]!.id}
          session={p.videos.map((v) => v.id)}
          onEnvoye={p.onEnvoye}
        />
      </div>
    </div>
  );
}
