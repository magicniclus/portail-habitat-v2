'use client';

import {
  distance,
  formatLongueur,
  longueurMur,
  milieu,
  type Aimantage,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import { RepereAccroche } from './GuidesSvg';
import { points } from './svg';

/** Cotes des murs : longueur sur l'axe, cliquable pour la modifier (DES-10). */
export function Cotes({
  niveau,
  mmParPx,
  dispatch,
  cliquables,
}: {
  niveau: Niveau;
  mmParPx: number;
  dispatch: Dispatch<Action>;
  /** Hors de l'outil Sélection, les étiquettes laissent passer les clics du tracé. */
  cliquables: boolean;
}) {
  const taille = 12 * mmParPx;
  return niveau.murs
    .filter((m) => m.type !== 'separation' && m.type !== 'poteau')
    .map((m) => {
      const l = longueurMur(m);
      const c = milieu(m.a, m.b);
      const d = m.epaisseur / 2 + 16 * mmParPx;
      const p = { x: c.x + (-(m.b.y - m.a.y) / l) * d, y: c.y + ((m.b.x - m.a.x) / l) * d };
      const texte = formatLongueur(l);
      return (
        <g
          key={m.id}
          pointerEvents={cliquables ? undefined : 'none'}
          className="cursor-pointer"
          onPointerDown={(ev) => {
            ev.stopPropagation();
            dispatch({ type: 'selectionner', selection: { genre: 'mur', id: m.id } });
          }}
        >
          <rect
            x={p.x - texte.length * taille * 0.3}
            y={p.y - taille * 0.75}
            width={texte.length * taille * 0.6}
            height={taille * 1.5}
            rx={taille * 0.75}
            fill={COULEURS_PLAN.etiquette}
            stroke={COULEURS_PLAN.etiquetteTrait}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={p.x}
            y={p.y + taille * 0.35}
            fontSize={taille}
            textAnchor="middle"
            fill={COULEURS_PLAN.cote}
            className="font-semibold select-none"
          >
            {texte}
          </text>
        </g>
      );
    });
}

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
          fill="none"
          className="stroke-accent"
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
      {etat.outil !== 'selection' ? (
        <TraceEnCours
          a={etat.trace}
          curseur={curseur?.point ?? null}
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
