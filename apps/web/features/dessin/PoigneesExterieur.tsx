'use client';

import type { Niveau, Point } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { PointerEvent } from 'react';
import type { EtatEditeur } from './etat';
import { memoCalque } from './memoCalque';

export type PoigneeExterieur = 'sommetTerrasse' | 'coteTerrasse' | 'coinPiscine';

/** Coins (bassin) d'une piscine, dans son propre sens : 0 (-,-), 1 (+,-), 2 (+,+), 3 (-,+). */
function coinsPiscine(p: Niveau['exterieur']['piscines'][number]): Point[] {
  const t = (p.rotation / 1800) * Math.PI;
  const [u, v] = [
    { x: Math.cos(t), y: Math.sin(t) },
    { x: -Math.sin(t), y: Math.cos(t) },
  ];
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => ({
    x: p.position.x + (u.x * a! * p.longueur) / 2 + (v.x * b! * p.largeur) / 2,
    y: p.position.y + (u.y * a! * p.longueur) / 2 + (v.y * b! * p.largeur) / 2,
  }));
}

/**
 * Poignées de la terrasse ou de la piscine choisie (DES-18, DES-20), au-dessus des murs : on
 * tire un coin (rond) ou un côté (carré) d'une terrasse, un coin d'une piscine, comme un sol.
 */
function PoigneesExterieurBrut({
  niveau,
  etat,
  mmParPx,
  demarrerPoigneeExterieur,
}: {
  niveau: Pick<Niveau, 'exterieur'>;
  etat: Pick<EtatEditeur, 'selection' | 'outil'>;
  mmParPx: number;
  demarrerPoigneeExterieur: (p: PoigneeExterieur, id: string, i: number, ev: PointerEvent) => void;
}) {
  const s = etat.selection;
  if (etat.outil !== 'selection' || !s) return null;
  const r = 7 * mmParPx;
  const style = {
    fill: 'white',
    stroke: COULEURS_PLAN.murSelection,
    strokeWidth: 2,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  const prise = (p: PoigneeExterieur, id: string, i: number) => ({
    onPointerDown: (ev: PointerEvent) => {
      ev.stopPropagation();
      demarrerPoigneeExterieur(p, id, i, ev);
    },
  });
  if (s.genre === 'terrasse') {
    const t = niveau.exterieur.terrasses.find((x) => x.id === s.id);
    if (!t) return null;
    return (
      <g>
        {t.contour.map((p, i) => {
          const q = t.contour[(i + 1) % t.contour.length]!;
          const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
          return (
            <g key={i}>
              <rect
                x={m.x - r * 0.8}
                y={m.y - r * 0.8}
                width={r * 1.6}
                height={r * 1.6}
                {...style}
                className="cursor-move"
                aria-label={`Côté ${i + 1} de la terrasse`}
                data-testid={`cote-terrasse-${i}`}
                {...prise('coteTerrasse', t.id, i)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                {...style}
                className="cursor-grab"
                aria-label={`Coin ${i + 1} de la terrasse`}
                data-testid={`coin-terrasse-${i}`}
                {...prise('sommetTerrasse', t.id, i)}
              />
            </g>
          );
        })}
      </g>
    );
  }
  if (s.genre === 'piscine') {
    const p = niveau.exterieur.piscines.find((x) => x.id === s.id);
    if (!p) return null;
    const coins = coinsPiscine(p);
    return (
      <g>
        {p.forme === 'ronde' || p.forme === 'haricot' || p.forme === 'ovale' ? (
          <polygon
            points={coins.map((c) => `${c.x},${c.y}`).join(' ')}
            fill="none"
            stroke={COULEURS_PLAN.murSelection}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ) : null}
        {coins.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={r}
            {...style}
            className="cursor-grab"
            aria-label={`Coin ${i + 1} de la piscine`}
            data-testid={`coin-piscine-${i}`}
            {...prise('coinPiscine', p.id, i)}
          />
        ))}
      </g>
    );
  }
  return null;
}

export const PoigneesExterieurSvg = memoCalque(
  PoigneesExterieurBrut,
  ['exterieur'],
  ['selection', 'outil'],
);
