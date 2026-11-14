'use client';

import { debutYoutube, idYoutube, integrationYoutube, miniatureYoutube } from '@ph/core/sites';
import { PlayIcon } from '@phosphor-icons/react';
import { useState } from 'react';

/**
 * Vidéo de présentation dans une carte Premium de l'annuaire : miniature d'abord (liste légère),
 * la vidéo YouTube (sans cookie) ne se charge qu'au clic.
 */
export function VideoCarte({ url, nom }: { url: string; nom: string }) {
  const [lecture, setLecture] = useState(false);
  const id = idYoutube(url);
  if (!id) return null;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[12px] bg-neutre-900">
      {lecture ? (
        <iframe
          src={`${integrationYoutube(id, debutYoutube(url))}&autoplay=1`}
          title={`Vidéo de présentation de ${nom}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLecture(true)}
          className="group absolute inset-0 size-full cursor-pointer border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- miniature YouTube 480 × 360 */}
          <img
            src={miniatureYoutube(id)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30">
            <span className="grid size-14 place-items-center rounded-full bg-blanc/95 text-texte shadow-lg">
              <PlayIcon size={26} weight="fill" aria-hidden="true" />
            </span>
          </span>
          <span className="sr-only">Lire la vidéo de présentation de {nom}</span>
        </button>
      )}
    </div>
  );
}
