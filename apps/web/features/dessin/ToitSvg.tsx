'use client';

import { toit3D, type Niveau, type Point3 } from '@ph/core/dessin';
import { memo, useMemo } from 'react';
import { points } from './svg';

const trait = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.2, fill: 'none' };
const auSol = (poly: readonly Point3[]) => points(poly.map((p) => ({ x: p.x, y: p.y })));

/**
 * Toiture vue de dessus (DES-16) : débords en pointillés, arêtes des pans, fenêtres de toit,
 * cheminées et lucarnes. Indicatif, ne capte pas les clics (le plan reste éditable dessous).
 */
function ToitSvgBrut({ niveau, dessus }: { niveau: Niveau; dessus: Niveau | null }) {
  const t = useMemo(() => toit3D(niveau, dessus), [niveau, dessus]);
  if (!t) return null;
  return (
    <g pointerEvents="none" className="stroke-neutre-600" aria-hidden="true" opacity={0.7}>
      {t.pans.map((p, i) => (
        <polygon key={i} points={auSol(p)} {...trait} strokeDasharray="8 5" />
      ))}
      {t.fenetres.map((f, i) => (
        <rect
          key={`f${i}`}
          x={f.centre.x - f.taille.l / 2}
          y={f.centre.y - f.taille.p / 2}
          width={f.taille.l}
          height={f.taille.p}
          transform={`rotate(${(f.angle * 180) / Math.PI} ${f.centre.x} ${f.centre.y})`}
          {...trait}
          className="fill-accent-100"
        />
      ))}
      {[...t.cheminees, ...t.lucarnes].map((c, i) => (
        <rect
          key={`c${i}`}
          x={c.centre.x - c.taille.l / 2}
          y={c.centre.y - c.taille.p / 2}
          width={c.taille.l}
          height={c.taille.p}
          transform={`rotate(${(c.angle * 180) / Math.PI} ${c.centre.x} ${c.centre.y})`}
          {...trait}
          strokeWidth={2}
        />
      ))}
    </g>
  );
}

/** Le toit ne dépend ni des meubles ni des annotations : les glisser ne le recalcule pas. */
const SANS_EFFET: ReadonlySet<string> = new Set(['objets', 'annotations']);
export const ToitSvg = memo(
  ToitSvgBrut,
  (a, b) =>
    a.dessus === b.dessus &&
    (Object.keys(a.niveau) as (keyof Niveau)[]).every(
      (k) => SANS_EFFET.has(k) || a.niveau[k] === b.niveau[k],
    ),
);
