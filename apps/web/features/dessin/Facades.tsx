'use client';

import {
  elevation,
  formatLongueur,
  type GenreTrace,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_COUVERTURE, COULEURS_ELEVATION as C } from '@ph/ui/tokens';
import { useMemo, type Dispatch } from 'react';
import { sceneDe, type Action, type EtatEditeur, type Facade } from './etat';

const CHOIX: { facade: Facade; libelle: string }[] = [
  { facade: 'sud', libelle: 'Sud' },
  { facade: 'nord', libelle: 'Nord' },
  { facade: 'est', libelle: 'Est' },
  { facade: 'ouest', libelle: 'Ouest' },
  { facade: 'coupe', libelle: 'Coupe' },
];
const MARGE = 2_500;

const altitude = (z: number) =>
  z === 0 ? '±0,00' : `${z > 0 ? '+' : '−'}${formatLongueur(Math.abs(z))}`;
const points = (pts: readonly Point[]) => pts.map((p) => `${p.x},${-p.y}`).join(' ');

/** Façades nord, sud, est, ouest et coupe tracée (DES-36), générées depuis le plan. */
export function Facades({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const scene = sceneDe(etat);
  const vue = etat.facade === 'coupe' ? etat.coupe : etat.facade;
  const e = useMemo(() => (vue ? elevation(scene, vue) : null), [scene, vue]);
  const toiture = scene.niveaux.find((n: Niveau) => n.toiture)?.toiture;
  const remplir: Record<GenreTrace, string> = {
    mur: C.enduit,
    pignon: C.enduit,
    baie: C.vitre,
    porte: C.porte,
    toit:
      COULEURS_COUVERTURE[
        (toiture?.couverture.famille ?? 'tuile') as keyof typeof COULEURS_COUVERTURE
      ] ?? COULEURS_COUVERTURE.tuile,
    coupe: C.coupe,
    plancher: C.plancher,
  };
  const titre =
    etat.facade === 'coupe'
      ? 'Coupe'
      : `Façade ${CHOIX.find((c) => c.facade === etat.facade)!.libelle.toLowerCase()}`;
  return (
    <div
      className="relative grid h-full w-full grid-rows-[auto_1fr] bg-blanc"
      data-testid="facades"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-neutre-200 px-3 py-2">
        <div
          role="radiogroup"
          aria-label="Façade"
          className="flex flex-wrap rounded-[10px] bg-neutre-100 p-1"
        >
          {CHOIX.map((c) => (
            <button
              key={c.facade}
              type="button"
              role="radio"
              aria-checked={etat.facade === c.facade}
              onClick={() => dispatch({ type: 'facade', facade: c.facade })}
              className={`min-h-11 cursor-pointer rounded-lg border-0 px-3 text-sm font-bold ${etat.facade === c.facade ? 'bg-blanc text-texte shadow-sm' : 'bg-transparent text-neutre-800'}`}
            >
              {c.libelle}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'vue', vue: 'plan' });
            dispatch({ type: 'outil', outil: 'coupe' });
          }}
          className="min-h-11 cursor-pointer rounded-lg border border-neutre-300 bg-blanc px-3 text-sm font-semibold text-accent-700"
        >
          {etat.coupe ? 'Tracer une autre coupe' : 'Tracer une coupe'}
        </button>
      </div>
      {e ? (
        <svg
          role="img"
          aria-label={titre}
          viewBox={`${e.cadre.x0 - MARGE * 1.6} ${-(e.cadre.y1 + MARGE)} ${e.cadre.x1 - e.cadre.x0 + MARGE * 2.6} ${e.cadre.y1 - e.cadre.y0 + MARGE * 1.6}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={e.cadre.x0 - MARGE * 2}
            y={0}
            width={e.cadre.x1 - e.cadre.x0 + MARGE * 4}
            height={400}
            fill={C.gazon}
          />
          {e.traces.map((t, i) => (
            <polygon
              key={i}
              points={points(t.pts)}
              fill={remplir[t.genre]}
              stroke={C.trait}
              strokeWidth={t.genre === 'coupe' ? 1.5 : 1}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              data-genre={t.genre}
            />
          ))}
          <line
            x1={e.cadre.x0 - MARGE * 2}
            x2={e.cadre.x1 + MARGE * 2}
            y1={0}
            y2={0}
            stroke={C.sol}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {e.reperes.map((r) => (
            <g key={`${r.libelle}${r.z}`} data-testid="repere-altitude">
              <line
                x1={e.cadre.x0 - MARGE * 1.4}
                x2={e.cadre.x0 - 200}
                y1={-r.z}
                y2={-r.z}
                stroke={C.repere}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={e.cadre.x0 - MARGE * 1.5}
                y={-r.z - 120}
                fontSize={300}
                fill={C.repere}
                className="font-semibold"
              >
                {r.libelle} {altitude(r.z)}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <p className="m-auto max-w-sm p-6 text-center text-sm text-neutre-800">
          {etat.facade === 'coupe'
            ? 'La coupe ne traverse pas la maison : tracez-la à travers les murs.'
            : 'Dessinez d’abord les murs : les façades se génèrent toutes seules.'}
        </p>
      )}
    </div>
  );
}
