'use client';

import { contourMur, contourObjet, type Element, type Niveau, type Point } from '@ph/core/dessin';
import { useCallback, useRef, useState, type Dispatch, type PointerEvent } from 'react';
import type { Action } from './etat';
import { points } from './svg';

/**
 * Sélection multiple au pointeur (DES-29) : Maj + clic ajoute ou retire un élément, un
 * rectangle tracé à la souris depuis le fond du plan choisit tout ce qu'il contient.
 */
export function useSelectionMultiple(dispatch: Dispatch<Action>) {
  const maj = useRef(false);
  const [zone, setZone] = useState<{ a: Point; b: Point } | null>(null);
  // Les calques reçoivent ce `dispatch` stable : un clic avec Maj devient un ajout.
  const dispatchPlan = useCallback<Dispatch<Action>>(
    (a) => dispatch(a.type === 'selectionner' && maj.current ? { ...a, ajouter: true } : a),
    [dispatch],
  );
  return {
    zone,
    dispatchPlan,
    /** Phase de capture : retient Maj avant que l'élément cliqué ne réagisse. */
    capter: (ev: PointerEvent) => {
      maj.current = ev.shiftKey;
    },
    /** Rectangle à la souris seulement : au doigt, glisser fait défiler le plan. */
    demarrer: (ev: PointerEvent, p: Point) => {
      if (ev.pointerType !== 'mouse') return false;
      setZone({ a: p, b: p });
      return true;
    },
    bouger: (p: Point) => {
      if (!zone) return false;
      setZone({ a: zone.a, b: p });
      return true;
    },
    finir: (mmParPx: number) => {
      if (!zone) return;
      setZone(null);
      const assez = Math.hypot(zone.b.x - zone.a.x, zone.b.y - zone.a.y) > 6 * mmParPx;
      dispatch(
        assez
          ? { type: 'selectionnerZone', a: zone.a, b: zone.b }
          : { type: 'selectionner', selection: null },
      );
    },
  };
}

/** Rectangle en cours de tracé. */
export function ZoneSelectionSvg({ zone }: { zone: { a: Point; b: Point } | null }) {
  if (!zone) return null;
  return (
    <rect
      x={Math.min(zone.a.x, zone.b.x)}
      y={Math.min(zone.a.y, zone.b.y)}
      width={Math.abs(zone.b.x - zone.a.x)}
      height={Math.abs(zone.b.y - zone.a.y)}
      className="fill-accent/10 stroke-accent"
      strokeWidth={1.5}
      strokeDasharray="6 4"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}

/** Contour en tirets de chaque élément de la sélection multiple. */
export function MultiSelectionSvg({
  niveau,
  multi,
}: {
  niveau: Niveau;
  multi: readonly Element[];
}) {
  if (!multi.length) return null;
  const formes = multi.flatMap((e): Point[][] => {
    if (e.genre === 'mur') {
      const m = niveau.murs.find((x) => x.id === e.id);
      return m ? [contourMur(m)] : [];
    }
    if (e.genre === 'objet') {
      const o = niveau.objets.find((x) => x.id === e.id);
      return o ? [contourObjet(o)] : [];
    }
    if (e.genre === 'cote') {
      const c = niveau.cotes.find((x) => x.id === e.id);
      return c ? [[c.a, c.b]] : [];
    }
    const t = niveau.textes.find((x) => x.id === e.id);
    return t
      ? [
          [
            { x: t.position.x - 300, y: t.position.y - 250 },
            { x: t.position.x + 300, y: t.position.y - 250 },
            { x: t.position.x + 300, y: t.position.y + 100 },
            { x: t.position.x - 300, y: t.position.y + 100 },
          ],
        ]
      : [];
  });
  return (
    <g pointerEvents="none" data-testid="selection-multiple">
      {formes.map((f, i) => (
        <polygon
          key={i}
          points={points(f)}
          className="fill-accent/15 stroke-accent"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
