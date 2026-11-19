import { regardCoupe } from '@ph/core/dessin';
import { COULEURS_ELEVATION as C } from '@ph/ui/tokens';
import type { EtatEditeur } from './etat';

/** Trait de coupe sur le plan (DES-36), avec les flèches du regard aux deux bouts. */
export function CoupeSvg({ coupe, mmParPx }: { coupe: EtatEditeur['coupe']; mmParPx: number }) {
  const g = coupe && regardCoupe(coupe.a, coupe.b);
  if (!coupe || !g) return null;
  const f = 18 * mmParPx;
  const fleche = (p: { x: number; y: number }) => {
    const bout = { x: p.x + g.d.x * f * 1.6, y: p.y + g.d.y * f * 1.6 };
    return `M${p.x - g.r.x * f * 0.5} ${p.y - g.r.y * f * 0.5} L${bout.x} ${bout.y} L${p.x + g.r.x * f * 0.5} ${p.y + g.r.y * f * 0.5} Z`;
  };
  return (
    <g pointerEvents="none" data-testid="trait-coupe">
      <line
        x1={coupe.a.x}
        y1={coupe.a.y}
        x2={coupe.b.x}
        y2={coupe.b.y}
        stroke={C.coupe}
        strokeWidth={2}
        strokeDasharray="14 4 3 4"
        vectorEffect="non-scaling-stroke"
      />
      <path d={fleche(coupe.a)} fill={C.coupe} />
      <path d={fleche(coupe.b)} fill={C.coupe} />
    </g>
  );
}
