'use client';

import type { Guide } from '@ph/core/dessin';

/** Guides du placement automatique (DES-22) : où l'objet s'est accroché pendant le glisser. */
export function GuidesSvg({ guides }: { guides: readonly Guide[] }) {
  if (!guides.length) return null;
  return (
    <g className="stroke-accent" pointerEvents="none" aria-hidden="true">
      {guides.map((g, i) => (
        <line
          key={i}
          x1={g.a.x}
          y1={g.a.y}
          x2={g.b.x}
          y2={g.b.y}
          vectorEffect="non-scaling-stroke"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="8 5"
        />
      ))}
    </g>
  );
}
