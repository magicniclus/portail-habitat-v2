'use client';

import { lireMesure, pointALongueur, type Point } from '@ph/core/dessin';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { Action } from './etat';

/**
 * Longueur tapée au clavier pendant le tracé d'un mur (DES-06) : un chiffre ouvre la saisie,
 * Entrée pose le point suivant à cette longueur, dans la direction du curseur.
 */
export function SaisieLongueur({
  trace,
  curseur,
  dispatch,
}: {
  trace: Point;
  curseur: Point | null;
  dispatch: Dispatch<Action>;
}) {
  const [saisie, setSaisie] = useState('');
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const ecouter = (ev: KeyboardEvent) => {
      if (!/^[0-9]$/.test(ev.key) || (ev.target as HTMLElement).closest('input, textarea, select'))
        return;
      ev.preventDefault();
      setSaisie(ev.key);
      champ.current?.focus();
    };
    document.addEventListener('keydown', ecouter);
    return () => document.removeEventListener('keydown', ecouter);
  }, []);
  const poser = () => {
    const l = lireMesure(saisie, 'cm');
    const p = l && curseur ? pointALongueur(trace, curseur, l) : null;
    if (p) dispatch({ type: 'poserPoint', point: p });
    setSaisie('');
    champ.current?.blur();
  };
  return (
    <label className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-blanc px-3 py-2 text-sm font-semibold shadow-md">
      Longueur (cm)
      <input
        ref={champ}
        inputMode="decimal"
        value={saisie}
        onChange={(ev) => setSaisie(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') poser();
          if (ev.key === 'Escape') setSaisie('');
        }}
        className="h-11 w-24 rounded-lg border border-neutre-300 px-2 text-base"
        aria-describedby="aide-longueur"
      />
      <span id="aide-longueur" className="text-xs font-normal text-neutre-800 max-[599px]:hidden">
        Entrée pour poser · Maj : droit
      </span>
    </label>
  );
}
