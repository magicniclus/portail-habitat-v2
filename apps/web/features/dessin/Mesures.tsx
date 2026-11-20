'use client';

import {
  coinZone,
  distance,
  formatLongueur,
  milieu,
  type Aimantage,
  type Point,
} from '@ph/core/dessin';
import { niveauDe, type EtatEditeur } from './etat';
import { ApercuPose } from './PoseObjetSvg';
import { RepereAccroche } from './GuidesSvg';
import { points } from './svg';

/**
 * Segment ou rectangle en cours. Un rectangle (pièce, zone, terrasse, allée, parcelle) affiche
 * « largeur × profondeur » ; un segment (mur, clôture, coupe, mesure) sa longueur.
 */
function TraceEnCours({
  a,
  curseur,
  rectangle,
  mmParPx,
}: {
  a: Point | null;
  curseur: Point | null;
  rectangle: boolean;
  mmParPx: number;
}) {
  if (!a || !curseur) return null;
  const taille = 12 * mmParPx;
  const c = milieu(a, curseur);
  return (
    <g pointerEvents="none">
      {rectangle ? (
        <rect
          x={Math.min(a.x, curseur.x)}
          y={Math.min(a.y, curseur.y)}
          width={Math.abs(curseur.x - a.x)}
          height={Math.abs(curseur.y - a.y)}
          className="fill-accent-100 stroke-accent"
          fillOpacity={0.6}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <line
          x1={a.x}
          y1={a.y}
          x2={curseur.x}
          y2={curseur.y}
          className="stroke-accent"
          strokeWidth={5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <text
        x={c.x}
        y={c.y - taille}
        fontSize={taille}
        textAnchor="middle"
        className="fill-texte font-bold"
      >
        {rectangle
          ? `${formatLongueur(Math.abs(curseur.x - a.x))} × ${formatLongueur(Math.abs(curseur.y - a.y))}`
          : formatLongueur(distance(a, curseur))}
      </text>
    </g>
  );
}

/** Le tracé en cours de cet état est-il un rectangle (deux coins opposés) ? */
const traceRectangle = (e: Pick<EtatEditeur, 'outil' | 'elementExterieur'>) =>
  e.outil === 'piece' ||
  e.outil === 'zone' ||
  (e.outil === 'exterieur' && e.elementExterieur !== 'cloture');

/** Tracé de l'outil en cours (s'il y en a un) et mesure de la mise à l'échelle. */
export function TracesEnCours({
  etat,
  curseur,
  mmParPx,
}: {
  etat: EtatEditeur;
  /** Point aimanté sous le pointeur ; `null` hors d'un outil de tracé. */
  curseur: Aimantage | null;
  mmParPx: number;
}) {
  return (
    <>
      {curseur && etat.aimant ? <RepereAccroche aimant={curseur} mmParPx={mmParPx} /> : null}
      {etat.outil === 'objet' || etat.outil === 'ouverture' || etat.outil === 'escalier' ? (
        <ApercuPose etat={etat} pointeur={curseur?.point ?? null} mmParPx={mmParPx} />
      ) : etat.outil !== 'selection' ? (
        <TraceEnCours
          a={etat.trace}
          curseur={
            etat.outil === 'zone' && etat.trace && curseur
              ? coinZone(niveauDe(etat), etat.trace, curseur.point)
              : (curseur?.point ?? null)
          }
          rectangle={traceRectangle(etat)}
          mmParPx={mmParPx}
        />
      ) : null}
      {etat.polygone.length > 1 ? (
        <polyline
          points={points(etat.polygone)}
          fill="none"
          className="stroke-accent"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ) : null}
      {etat.echelle ? (
        <TraceEnCours
          a={etat.echelle.a}
          curseur={etat.echelle.b}
          rectangle={false}
          mmParPx={mmParPx}
        />
      ) : null}
    </>
  );
}
