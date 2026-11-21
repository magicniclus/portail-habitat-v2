'use client';

import type { RealisationPro } from '@ph/firebase/pro';
import { ArrowCounterClockwiseIcon, TrashIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { TYPES_IMAGE } from './fichiers';

/** Photos d'un projet en cours de modification : chacune gardée ou retirée (annulable). */
export function PhotosGardees({
  photos,
  conservees,
  onChange,
  titre,
}: {
  photos: RealisationPro['photos'];
  conservees: string[];
  onChange: (c: string[]) => void;
  titre: string;
}) {
  return (
    <fieldset className="m-0 grid gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[15px] font-semibold">Photos du projet</legend>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
        {photos.map((p, i) => {
          const gardee = conservees.includes(p.storagePath);
          return (
            <li key={p.storagePath} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo Storage du projet */}
              <img
                src={p.url}
                alt={`${titre}, photo ${i + 1}`}
                className={`aspect-square w-full rounded-[10px] object-cover ${gardee ? '' : 'opacity-35 grayscale'}`}
              />
              <button
                type="button"
                onClick={() =>
                  onChange(
                    gardee
                      ? conservees.filter((c) => c !== p.storagePath)
                      : [...conservees, p.storagePath],
                  )
                }
                aria-label={`${gardee ? 'Retirer' : 'Garder'} la photo ${i + 1}`}
                className="absolute top-1 right-1 grid size-11 place-items-center rounded-full bg-blanc/95 text-texte shadow-sm focus-visible:outline-2 focus-visible:outline-accent"
              >
                {gardee ? (
                  <TrashIcon size={18} aria-hidden="true" />
                ) : (
                  <ArrowCounterClockwiseIcon size={18} aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/** Choix des photos d'un projet (plusieurs à la fois, `max` au plus). */
export function ChampPhotosProjet({
  libelle,
  max,
  onChange,
}: {
  libelle: string;
  max: number;
  onChange: (f: File[]) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {libelle}{' '}
        <span className="font-normal text-neutre-700">
          (JPEG, PNG ou WebP, 8 Mo au plus chacune)
        </span>
      </label>
      <input
        id={id}
        type="file"
        multiple
        accept={TYPES_IMAGE.join(',')}
        onChange={(e) => onChange(Array.from(e.target.files ?? []).slice(0, Math.max(0, max)))}
        className="min-h-11 w-full text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-trait file:bg-blanc file:px-4 file:font-semibold"
      />
    </div>
  );
}
