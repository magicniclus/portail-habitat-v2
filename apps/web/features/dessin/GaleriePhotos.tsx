'use client';

import { formatDate } from '@ph/core/format';
import { DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { lireFond, listerPhotos, supprimerPhoto, type EspaceDessin } from './api';

type Photo = { storagePath: string; creeLe: number };

/** Une vignette : l'image n'est lue qu'à l'affichage (galerie de 30 photos au plus). */
function Vignette({
  photo,
  espace,
  planId,
  retirer,
}: {
  photo: Photo;
  espace: EspaceDessin;
  planId: string;
  retirer: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    void lireFond(espace, planId, photo.storagePath).then((r) => {
      if (actif && r.ok) setUrl(r.data.url);
    });
    return () => {
      actif = false;
    };
  }, [espace, planId, photo.storagePath]);
  const date = formatDate(new Date(photo.creeLe));
  return (
    <li className="grid gap-1">
      <div className="aspect-video overflow-hidden rounded-lg bg-neutre-100">
        {url ? (
          // Image en data URL lue côté serveur : pas d'optimisation Next possible.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Photo du ${date}`} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-neutre-800">{date}</span>
        <span className="flex">
          <a
            href={url ?? undefined}
            download={`plan-photo-${photo.creeLe}.jpg`}
            aria-label={`Télécharger la photo du ${date}`}
            className="grid size-11 place-items-center rounded-lg text-texte hover:bg-neutre-100"
          >
            <DownloadSimpleIcon aria-hidden="true" />
          </a>
          <button
            type="button"
            aria-label={`Supprimer la photo du ${date}`}
            onClick={retirer}
            className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-texte hover:bg-neutre-100"
          >
            <TrashIcon aria-hidden="true" />
          </button>
        </span>
      </div>
    </li>
  );
}

/** Galerie « Mes photos » du plan (DES-37). */
export function GaleriePhotos({
  espace,
  planId,
  revision,
}: {
  espace: EspaceDessin;
  planId: string;
  revision: number;
}) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  useEffect(() => {
    let actif = true;
    void listerPhotos(espace, planId).then((r) => {
      if (actif) setPhotos(r.ok ? r.data.photos : []);
    });
    return () => {
      actif = false;
    };
  }, [espace, planId, revision]);
  const retirer = async (p: Photo) => {
    const r = await supprimerPhoto(espace, planId, p.storagePath);
    if (r.ok) setPhotos((l) => (l ?? []).filter((x) => x.storagePath !== p.storagePath));
  };
  return (
    <section aria-labelledby="mes-photos" className="grid gap-2 px-1">
      <h3 id="mes-photos" className="m-0 text-sm font-bold">
        Mes photos {photos ? `(${photos.length})` : ''}
      </h3>
      {photos === null ? (
        <p className="m-0 text-sm text-neutre-800">Chargement…</p>
      ) : photos.length === 0 ? (
        <p className="m-0 text-sm leading-5 text-neutre-800">
          Aucune photo pour l’instant : passez en vue Photo et cadrez votre projet.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {photos.map((p) => (
            <Vignette
              key={p.storagePath}
              photo={p}
              espace={espace}
              planId={planId}
              retirer={() => void retirer(p)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
