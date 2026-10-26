'use client';

import type { RealisationPro } from '@ph/firebase/pro';
import { Button } from '@ph/ui';
import { ImageIcon, MapPinIcon } from '@phosphor-icons/react';

/**
 * Carte d'un projet réalisé (maquette Ma fiche) : photo 4:3, interrupteur « Public », titre,
 * métier, description et ville. Sans photo : emplacement « Photo du chantier ».
 */
export function CarteProjet({
  r,
  nomMetier,
  modifiable,
  basculer,
  retirer,
}: {
  r: RealisationPro;
  nomMetier?: string;
  modifiable: boolean;
  basculer: (publie: boolean) => void;
  retirer: () => void;
}) {
  const photo = r.photos[0];
  return (
    <li className="flex flex-col overflow-hidden rounded-[14px] border border-trait bg-blanc">
      <div className="relative aspect-[4/3] bg-neutre-200">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos Storage, dimensions connues
          <img
            src={photo.url}
            alt={r.titre}
            width={photo.largeur}
            height={photo.hauteur}
            loading="lazy"
            className={`size-full object-cover ${r.publie ? '' : 'opacity-60'}`}
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 text-sm text-neutre-800">
            <ImageIcon size={26} aria-hidden="true" />
            Photo du chantier
          </span>
        )}
        {modifiable ? (
          <button
            type="button"
            role="switch"
            aria-checked={r.publie}
            aria-label={`Public : ${r.titre}`}
            onClick={() => basculer(!r.publie)}
            className="absolute top-0 left-0 flex min-h-11 items-center p-2 focus-visible:outline-none [&:focus-visible>span]:outline-2 [&:focus-visible>span]:outline-accent"
          >
            <span className="flex items-center gap-2 rounded-pill bg-blanc py-1 pr-1.5 pl-2.5 text-xs font-semibold shadow-sm">
              Public
              <span
                aria-hidden="true"
                className={`flex h-4 w-7 rounded-pill p-0.5 motion-safe:transition-colors ${
                  r.publie ? 'justify-end bg-accent' : 'justify-start bg-neutre-400'
                }`}
              >
                <span className="size-3 rounded-full bg-blanc" />
              </span>
            </span>
          </button>
        ) : null}
      </div>
      <div className="grid flex-1 content-start gap-2 p-3.5">
        <strong className="text-base">{r.titre}</strong>
        {nomMetier ? (
          <span className="justify-self-start rounded-pill border border-trait px-2.5 py-1 text-xs font-semibold">
            {nomMetier}
          </span>
        ) : null}
        {r.description ? (
          <p className="m-0 text-sm leading-[21px] text-neutre-800">{r.description}</p>
        ) : null}
        <span className="flex items-center gap-1.5 text-[13px] text-neutre-700">
          <MapPinIcon size={15} aria-hidden="true" />
          {r.ville}
        </span>
        {modifiable ? (
          <Button
            variant="fantome"
            taille="sm"
            onClick={retirer}
            aria-label={`Retirer ${r.titre}`}
            className="justify-self-start px-0"
          >
            Retirer
          </Button>
        ) : null}
      </div>
    </li>
  );
}
