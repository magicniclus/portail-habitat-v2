'use client';

import { LIBELLES_CALQUE, TYPES_CALQUE } from '@ph/core/studio';
import { Button } from '@ph/ui';
import { useRef } from 'react';

/** Barre de l'éditeur : « + Ajouter » (animation ou plan à la tête de lecture), couper, annuler, zoom, enregistrer. */
export function BarreMontage({
  onAnimation,
  onPlan,
  onCouper,
  onAnnuler,
  onRetablir,
  zoom,
  onZoom,
  enregistrable,
  enCours,
  onEnregistrer,
}: {
  onAnimation: (t: (typeof TYPES_CALQUE)[number]) => void;
  onPlan: (quoi: 'carton' | 'capture') => void;
  onCouper: () => void;
  onAnnuler: (() => void) | undefined;
  onRetablir: (() => void) | undefined;
  zoom: number;
  onZoom: (z: number) => void;
  enregistrable: boolean;
  enCours: boolean;
  onEnregistrer: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  /** Un choix referme le menu. */
  const choisir = (f: () => void) => () => {
    f();
    if (menu.current) menu.current.open = false;
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <details ref={menu} className="relative">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-control bg-accent px-4 font-semibold text-blanc">
          + Ajouter
        </summary>
        <div className="absolute z-20 mt-1 grid w-60 gap-0.5 rounded-card border border-trait bg-blanc p-1.5 shadow-lg">
          <p className="m-0 px-2 pt-1 text-xs font-semibold text-neutre-700">
            À la tête de lecture
          </p>
          {TYPES_CALQUE.map((t) => (
            <Button
              key={t}
              variant="fantome"
              taille="sm"
              className="justify-start"
              onClick={choisir(() => onAnimation(t))}
            >
              {LIBELLES_CALQUE[t]}
            </Button>
          ))}
          <p className="m-0 border-t border-trait px-2 pt-1.5 text-xs font-semibold text-neutre-700">
            Nouveau plan
          </p>
          <Button
            variant="fantome"
            taille="sm"
            className="justify-start"
            onClick={choisir(() => onPlan('carton'))}
          >
            Carton (texte plein écran)
          </Button>
          <Button
            variant="fantome"
            taille="sm"
            className="justify-start"
            onClick={choisir(() => onPlan('capture'))}
          >
            Capture Portail Travaux
          </Button>
        </div>
      </details>
      <Button variant="secondaire" taille="sm" onClick={onCouper}>
        ✂ Couper ici
      </Button>
      <Button
        variant="fantome"
        taille="sm"
        disabled={!onAnnuler}
        onClick={onAnnuler}
        aria-label="Annuler (Ctrl+Z)"
      >
        ↶ Annuler
      </Button>
      <Button
        variant="fantome"
        taille="sm"
        disabled={!onRetablir}
        onClick={onRetablir}
        aria-label="Rétablir (Ctrl+Y)"
      >
        ↷ Rétablir
      </Button>
      <label className="ml-auto flex min-h-11 items-center gap-2 text-sm">
        Zoom
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.25}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
        />
      </label>
      <Button disabled={!enregistrable} onClick={onEnregistrer}>
        {enCours ? 'Enregistrement…' : 'Enregistrer et refaire la vidéo'}
      </Button>
    </div>
  );
}
