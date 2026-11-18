'use client';

import {
  aimanter,
  arrondir,
  distance,
  toleranceEnMm,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent } from 'react';
import { EtiquettesPieces, MursSvg, PiecesSvg } from './CalquesPlan';
import { Cotes, TraceEnCours } from './Mesures';
import { niveauDe, type Action, type EtatEditeur } from './etat';

/** Cadre du dessin en mm : tout le niveau, avec une marge, et au moins 12 × 10 m. */
function cadreDe(n: Niveau): { x: number; y: number; l: number; h: number } {
  const points = n.murs.flatMap((m) => [m.a, m.b]);
  const MARGE = 3_000;
  if (points.length === 0)
    return { x: -MARGE, y: -MARGE, l: 12_000 + 2 * MARGE, h: 10_000 + 2 * MARGE };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs) - MARGE;
  const y = Math.min(...ys) - MARGE;
  return {
    x,
    y,
    l: Math.max(Math.max(...xs) + MARGE - x, 12_000),
    h: Math.max(Math.max(...ys) + MARGE - y, 10_000),
  };
}

/** Plan 2D (DES-06, DES-32) : SVG en millimètres, net à tout zoom, exportable. */
export function Plan2D({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const n = niveauDe(etat);
  const svg = useRef<SVGSVGElement>(null);
  const [curseur, setCurseur] = useState<Point | null>(null);
  const glisser = useRef<{ murId: string; dernier: Point; geste: string } | null>(null);
  const cadre = useMemo(() => cadreDe(n), [n]);
  const conteneur = useRef<HTMLDivElement>(null);
  const cadreCourant = useRef(cadre);
  useEffect(() => {
    cadreCourant.current = cadre;
  }, [cadre]);

  // Ajuster à l'écran : à l'ouverture et à la demande (bouton du zoom).
  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const c = cadreCourant.current;
    if (width > 0 && height > 0)
      dispatch({ type: 'zoom', zoom: Math.min((width / c.l) * 1000, (height / c.h) * 1000) });
  }, [etat.ajustement, dispatch]);
  const mmParPx = 1000 / etat.zoom;

  const cibles = useMemo(
    () => ({
      points: n.murs.flatMap((m) => [m.a, m.b]),
      segments: n.murs.map((m) => [m.a, m.b] as const),
    }),
    [n.murs],
  );

  const versMm = (ev: PointerEvent): Point | null => {
    const el = svg.current;
    const matrice = el?.getScreenCTM();
    if (!el || !matrice) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrice.inverse());
    return { x: p.x, y: p.y };
  };
  const aimante = (p: Point): Point =>
    etat.aimant
      ? aimanter(p, cibles, {
          tolerance: toleranceEnMm(12, etat.zoom),
          grille: 50,
          ...(etat.trace ? { origine: etat.trace } : {}),
        }).point
      : arrondir(p);

  const trace = etat.outil !== 'selection';

  return (
    <div
      ref={conteneur}
      className="h-full w-full overflow-auto"
      style={{ background: COULEURS_PLAN.fond }}
      data-testid="plan-2d"
    >
      <svg
        ref={svg}
        role="img"
        aria-label={`Plan 2D du niveau ${n.nom}`}
        width={Math.round(cadre.l / mmParPx)}
        height={Math.round(cadre.h / mmParPx)}
        viewBox={`${cadre.x} ${cadre.y} ${cadre.l} ${cadre.h}`}
        className={trace ? 'cursor-crosshair touch-none' : 'touch-none'}
        style={{ background: COULEURS_PLAN.fond }}
        onPointerMove={(ev) => {
          const p = versMm(ev);
          if (!p) return;
          const g = glisser.current;
          if (g) {
            const vers = arrondir(p);
            const delta = { x: vers.x - g.dernier.x, y: vers.y - g.dernier.y };
            if (distance(vers, g.dernier) >= 10) {
              dispatch({ type: 'deplacerMur', murId: g.murId, delta, geste: g.geste });
              g.dernier = vers;
            }
            return;
          }
          if (trace) setCurseur(aimante(p));
        }}
        onPointerDown={(ev) => {
          if (ev.target !== ev.currentTarget && !trace) return;
          const p = versMm(ev);
          if (!p) return;
          if (trace) dispatch({ type: 'poserPoint', point: aimante(p) });
          else dispatch({ type: 'selectionner', selection: null });
        }}
        onPointerUp={() => {
          if (!glisser.current) return;
          glisser.current = null;
          dispatch({ type: 'finGeste' });
        }}
        onDoubleClick={() => dispatch({ type: 'terminerTrace' })}
      >
        <PiecesSvg niveau={n} etat={etat} dispatch={dispatch} />
        <MursSvg
          niveau={n}
          etat={etat}
          dispatch={dispatch}
          demarrerGlisser={(murId, ev) => {
            const p = versMm(ev);
            if (!p || trace) return;
            (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
            glisser.current = {
              murId,
              dernier: arrondir(p),
              geste: `glisser-${murId}-${Date.now()}`,
            };
          }}
        />
        {etat.calques.cotes ? (
          <Cotes niveau={n} mmParPx={mmParPx} dispatch={dispatch} cliquables={!trace} />
        ) : null}
        <EtiquettesPieces niveau={n} etat={etat} mmParPx={mmParPx} />
        {trace ? <TraceEnCours etat={etat} curseur={curseur} mmParPx={mmParPx} /> : null}
      </svg>
    </div>
  );
}
