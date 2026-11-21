import type { Point } from '@ph/core/dessin';
import { COULEURS_EXTERIEUR as C } from '@ph/ui/tokens';
import type { Dispatch, PointerEvent } from 'react';
import type { Action, EtatEditeur } from './etat';
import { activer, points } from './svg';

/**
 * Parcelle (DES-19), retouchable après la pose : on la choisit en cliquant sur sa limite, puis
 * on la fait glisser, on tire un coin (rond) ou l'on ajoute un angle (« + » au milieu d'un
 * côté, puis on le tire). L'intérieur reste libre : les clics y vont à la maison et au jardin.
 */
export function ParcelleSvg({
  parcelle,
  etat,
  dispatch,
  mmParPx,
  demarrerParcelle,
  demarrerSommetParcelle,
}: {
  parcelle: Point[] | null;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  mmParPx: number;
  demarrerParcelle: (ev: PointerEvent) => void;
  demarrerSommetParcelle: (i: number, ev: PointerEvent) => void;
}) {
  if (!parcelle) return null;
  const choisie = etat.selection?.genre === 'parcelle';
  const libre = etat.outil === 'selection';
  const choisir = () =>
    dispatch({ type: 'selectionner', selection: { genre: 'parcelle', id: 'parcelle' } });
  const r = 7 * mmParPx;
  return (
    <g>
      <polygon
        points={points(parcelle)}
        fill="none"
        stroke={C.parcelle}
        strokeWidth={choisie ? 2.5 : 1.5}
        strokeDasharray="12 6"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        data-testid="limite-parcelle"
      />
      {/* Zone de prise le long de la limite : 16 px, plus facile à attraper qu'un trait fin. */}
      <polygon
        role="button"
        tabIndex={0}
        aria-label="Parcelle"
        aria-pressed={choisie}
        points={points(parcelle)}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        vectorEffect="non-scaling-stroke"
        pointerEvents={libre ? 'stroke' : 'none'}
        className="cursor-move"
        onPointerDown={(ev) => {
          ev.stopPropagation();
          choisir();
          demarrerParcelle(ev);
        }}
        onKeyDown={activer(choisir)}
      />
      {choisie && libre
        ? parcelle.map((p, i) => {
            const q = parcelle[(i + 1) % parcelle.length]!;
            const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
            return (
              <g key={i}>
                <g
                  role="button"
                  aria-label={`Ajouter un angle au côté ${i + 1}`}
                  className="cursor-copy"
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    dispatch({ type: 'ajouterSommetParcelle', apres: i, point: m });
                    demarrerSommetParcelle(i + 1, ev);
                  }}
                >
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r * 0.8}
                    fill="white"
                    stroke={C.parcelle}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`M${m.x - r * 0.4} ${m.y}h${r * 0.8}M${m.x} ${m.y - r * 0.4}v${r * 0.8}`}
                    stroke={C.parcelle}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="white"
                  stroke={C.parcelle}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-grab"
                  aria-label={`Coin ${i + 1} de la parcelle`}
                  data-testid={`coin-parcelle-${i}`}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    demarrerSommetParcelle(i, ev);
                  }}
                />
              </g>
            );
          })
        : null}
    </g>
  );
}

/** Pelouse de la parcelle (DES-19) : un fond vert sous le jardin, la maison et la terrasse. */
export function PelouseSvg({ parcelle }: { parcelle: Point[] | null }) {
  if (!parcelle) return null;
  return (
    <polygon
      points={points(parcelle)}
      fill={C.gazon}
      fillOpacity={0.55}
      stroke="none"
      pointerEvents="none"
      data-testid="pelouse"
    />
  );
}
