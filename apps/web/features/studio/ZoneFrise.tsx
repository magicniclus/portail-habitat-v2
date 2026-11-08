'use client';

import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@phosphor-icons/react';
import { useState, type ComponentProps } from 'react';
import { PistesFrise } from './PistesFrise';

const ZOOMS = [0.01, 0.02, 0.04, 0.08, 0.15, 0.3] as const;
const ZOOM =
  'flex size-9 items-center justify-center rounded-[8px] hover:bg-montage-survol disabled:opacity-40';

/** Bas de l'éditeur : zoom de la frise et pistes (défilement dans les deux sens). */
export function ZoneFrise(p: Omit<ComponentProps<typeof PistesFrise>, 'px'>) {
  const [zoom, setZoom] = useState(3);
  const px = ZOOMS[zoom]!;
  return (
    <section
      aria-label="Frise"
      className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)] bg-montage-panneau"
    >
      <div className="flex items-center gap-1 border-b border-montage-trait px-2">
        <button
          type="button"
          className={ZOOM}
          disabled={zoom === 0}
          onClick={() => setZoom(zoom - 1)}
          aria-label="Dézoomer"
        >
          <MagnifyingGlassMinusIcon size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={ZOOM}
          disabled={zoom === ZOOMS.length - 1}
          onClick={() => setZoom(zoom + 1)}
          aria-label="Zoomer"
        >
          <MagnifyingGlassPlusIcon size={18} aria-hidden="true" />
        </button>
        <p className="m-0 ml-2 text-xs text-montage-texte-doux">
          Glissez vos fichiers sur une piste · S coupe le clip choisi · Suppr l’efface
        </p>
      </div>
      <div className="min-h-0 overflow-auto">
        <PistesFrise
          frise={p.frise}
          px={px}
          tete={p.tete}
          selection={p.selection}
          onSelection={p.onSelection}
          onTete={p.onTete}
          onDebut={p.onDebut}
          onChange={p.onChange}
          changer={p.changer}
          onDepot={p.onDepot}
          onFichiers={p.onFichiers}
        />
      </div>
    </section>
  );
}
