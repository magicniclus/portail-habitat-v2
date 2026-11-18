'use client';

import type { Niveau, Point } from '@ph/core/dessin';
import { cadreDe } from '../cadre';

/** Mini-plan de la visite (DES-34) : murs du niveau, position et direction du visiteur. */
export function MiniPlan({ n, position, lacet }: { n: Niveau; position: Point; lacet: number }) {
  const c = cadreDe(n);
  const f = { x: Math.cos(lacet), y: Math.sin(lacet) };
  const t = Math.max(c.l, c.h) / 40;
  return (
    <svg
      role="img"
      aria-label="Mini-plan : votre position"
      viewBox={`${c.x} ${c.y} ${c.l} ${c.h}`}
      className="absolute top-3 right-3 h-36 w-36 rounded-xl border border-trait bg-blanc/90 p-1.5 shadow-md"
    >
      {n.murs.map((m) => (
        <line
          key={m.id}
          x1={m.a.x}
          y1={m.a.y}
          x2={m.b.x}
          y2={m.b.y}
          className="stroke-texte"
          strokeWidth={m.epaisseur}
          strokeLinecap="square"
        />
      ))}
      <polygon
        className="fill-accent"
        points={[
          [position.x + f.x * t * 2, position.y + f.y * t * 2],
          [position.x - f.y * t, position.y + f.x * t],
          [position.x + f.y * t, position.y - f.x * t],
        ]
          .map(([x, y]) => `${x},${y}`)
          .join(' ')}
      />
    </svg>
  );
}
