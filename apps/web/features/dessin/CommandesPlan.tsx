'use client';

import {
  CornersOutIcon,
  ListIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import { ZOOM_DEFAUT, type Action, type EtatEditeur } from './etat';

const pastille = (actif: boolean) =>
  `min-h-11 cursor-pointer rounded-full border px-3.5 text-[13px] font-bold ${actif ? 'border-texte bg-texte text-blanc' : 'border-neutre-300 bg-blanc text-neutre-800'}`;
const carre =
  'flex size-11 cursor-pointer items-center justify-center border-0 bg-blanc text-neutre-800 hover:bg-neutre-100';

/** Calques (haut droite), zoom (bas droite) et, sur téléphone, accès aux feuilles du bas. */
export function CommandesPlan({
  etat,
  dispatch,
  telephone,
  ouvrir,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  telephone: boolean;
  ouvrir: (f: 'bibliotheque' | 'inspecteur') => void;
}) {
  return (
    <>
      <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5 max-[899px]:top-auto max-[899px]:right-auto max-[899px]:bottom-20 max-[899px]:left-3">
        <button
          type="button"
          aria-pressed={etat.calques.cotes}
          className={pastille(etat.calques.cotes)}
          onClick={() => dispatch({ type: 'calque', cle: 'cotes' })}
        >
          Cotes
        </button>
        <button
          type="button"
          aria-pressed={etat.calques.surfaces}
          className={pastille(etat.calques.surfaces)}
          onClick={() => dispatch({ type: 'calque', cle: 'surfaces' })}
        >
          Surfaces
        </button>
      </div>
      <div className="absolute right-3 bottom-3 flex flex-col items-center overflow-hidden rounded-xl border border-trait bg-blanc shadow-sm max-[899px]:bottom-20">
        <button
          type="button"
          aria-label="Zoomer"
          className={carre}
          onClick={() => dispatch({ type: 'zoom', zoom: etat.zoom * 1.25 })}
        >
          <MagnifyingGlassPlusIcon size={20} aria-hidden="true" />
        </button>
        <span className="py-0.5 text-xs font-bold text-neutre-800" aria-live="polite">
          {Math.round((etat.zoom / ZOOM_DEFAUT) * 100)} %
        </span>
        <button
          type="button"
          aria-label="Dézoomer"
          className={carre}
          onClick={() => dispatch({ type: 'zoom', zoom: etat.zoom / 1.25 })}
        >
          <MagnifyingGlassMinusIcon size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Ajuster à l’écran"
          className={`${carre} border-t border-trait`}
          onClick={() => dispatch({ type: 'ajuster' })}
        >
          <CornersOutIcon size={20} aria-hidden="true" />
        </button>
      </div>
      {telephone ? (
        <div className="absolute top-3 left-3 flex gap-2">
          <button type="button" className={pastille(false)} onClick={() => ouvrir('bibliotheque')}>
            <ListIcon aria-hidden="true" className="mr-1 inline" /> Bibliothèque
          </button>
          <button type="button" className={pastille(false)} onClick={() => ouvrir('inspecteur')}>
            <SlidersHorizontalIcon aria-hidden="true" className="mr-1 inline" /> Propriétés
          </button>
        </div>
      ) : null}
    </>
  );
}
