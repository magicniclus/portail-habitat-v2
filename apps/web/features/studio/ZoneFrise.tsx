'use client';

import { ajouterPiste, clipParId, type TypePiste } from '@ph/core/studio';
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ScissorsIcon,
  WaveSineIcon,
} from '@phosphor-icons/react';
import { useState, type ComponentProps } from 'react';
import { PistesFrise } from './PistesFrise';

const ZOOMS = [0.01, 0.02, 0.04, 0.08, 0.15, 0.3] as const;
const ZOOM =
  'flex size-9 items-center justify-center rounded-[8px] hover:bg-montage-survol disabled:opacity-40';

const PISTES: [TypePiste, string][] = [
  ['video', '+ Vidéo'],
  ['audio', '+ Audio'],
  ['texte', '+ Effets'],
];

/**
 * Bas de l'éditeur : outils (zoom, ciseaux, ajout de pistes, automation) et pistes (défilement
 * dans les deux sens).
 */
export function ZoneFrise(
  p: Omit<ComponentProps<typeof PistesFrise>, 'px' | 'automation'> & {
    /** Couper le clip choisi à la tête de lecture. */
    onScinder: () => void;
  },
) {
  const { onScinder, ...pistes } = p;
  const [zoom, setZoom] = useState(3);
  const choisi = p.selection ? clipParId(p.frise, p.selection)?.clip : undefined;
  const coupable = Boolean(choisi && p.tete > choisi.debut && p.tete < choisi.debut + choisi.duree);
  const [automation, setAutomation] = useState(false);
  const px = ZOOMS[zoom]!;
  return (
    <section
      aria-label="Frise"
      className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)] bg-montage-panneau"
    >
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-montage-trait px-2">
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
        <button
          type="button"
          className={ZOOM}
          disabled={!coupable}
          onClick={onScinder}
          aria-label="Couper le clip à la tête de lecture (S)"
          title="Couper le clip choisi à la tête de lecture (S)"
        >
          <ScissorsIcon size={18} aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-montage-trait" />
        {PISTES.map(([type, libelle]) => (
          <button
            key={type}
            type="button"
            onClick={() => p.changer(ajouterPiste(p.frise, type))}
            disabled={p.frise.pistes.length >= 16}
            title="Ajouter une piste (16 au plus ; entre deux pistes vidéo, celle du haut passe devant)"
            className="flex min-h-9 items-center rounded-[8px] px-2.5 text-sm hover:bg-montage-survol disabled:opacity-40"
          >
            {libelle}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={automation}
          onClick={() => setAutomation(!automation)}
          title="Dessiner le volume (son) ou l’opacité (image) sur le clip choisi"
          className="ml-1 flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm hover:bg-montage-survol aria-pressed:bg-montage-selection aria-pressed:text-montage-fond"
        >
          <WaveSineIcon size={18} aria-hidden="true" />
          Automation
        </button>
        <p className="m-0 ml-2 hidden truncate text-xs text-montage-texte-doux xl:block">
          Glissez vos fichiers sur une piste · S coupe le clip choisi · Suppr l’efface
        </p>
      </div>
      <div className="min-h-0 overflow-auto">
        <PistesFrise {...pistes} px={px} automation={automation} />
      </div>
    </section>
  );
}
