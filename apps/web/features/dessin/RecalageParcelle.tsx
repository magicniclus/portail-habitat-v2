'use client';

import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from '@phosphor-icons/react';
import type { Dispatch, ReactNode } from 'react';
import type { Action } from './etat';

const PAS = 500;
const bouton =
  'grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border border-neutre-300 bg-blanc px-2 text-xs text-texte hover:bg-neutre-100';

/** Flèches (50 cm par clic) et rotation (5° ou 0,5°) de la parcelle sous la maison (DES-35). */
export function RecalageParcelle({
  orientationNord,
  dispatch,
}: {
  orientationNord: number;
  dispatch: Dispatch<Action>;
}) {
  const decaler = (x: number, y: number) =>
    dispatch({ type: 'ajusterImplantation', decalage: { x, y } });
  const pivoter = (rotation: number) => dispatch({ type: 'ajusterImplantation', rotation });
  const fleches: [string, ReactNode, () => void][] = [
    ['haut', <ArrowUpIcon key="h" aria-hidden="true" />, () => decaler(0, -PAS)],
    ['gauche', <ArrowLeftIcon key="g" aria-hidden="true" />, () => decaler(-PAS, 0)],
    ['droite', <ArrowRightIcon key="d" aria-hidden="true" />, () => decaler(PAS, 0)],
    ['bas', <ArrowDownIcon key="b" aria-hidden="true" />, () => decaler(0, PAS)],
  ];
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Déplacer la parcelle">
          {fleches.map(([sens, icone, faire], i) => (
            <button
              key={sens}
              type="button"
              className={`${bouton} ${['col-start-2', 'col-start-1', 'col-start-3', 'col-start-2'][i]}`}
              aria-label={`Parcelle vers ${sens === 'haut' || sens === 'bas' ? 'le' : 'la'} ${sens}`}
              onClick={faire}
            >
              {icone}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Faire pivoter la parcelle">
          <button
            type="button"
            className={bouton}
            aria-label="Pivoter de 5° à gauche"
            onClick={() => pivoter(-50)}
          >
            <ArrowArcLeftIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className={bouton}
            aria-label="Pivoter de 5° à droite"
            onClick={() => pivoter(50)}
          >
            <ArrowArcRightIcon aria-hidden="true" />
          </button>
          <button type="button" className={bouton} onClick={() => pivoter(-5)}>
            −0,5°
          </button>
          <button type="button" className={bouton} onClick={() => pivoter(5)}>
            +0,5°
          </button>
        </div>
      </div>
      <p className="m-0 px-1 text-[13px] text-neutre-800">
        Nord à {(orientationNord / 10).toLocaleString('fr-FR')}° du haut du plan. Flèches : 50 cm
        par clic.
      </p>
    </div>
  );
}
