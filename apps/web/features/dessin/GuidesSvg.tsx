import type { Aimantage, Guide } from '@ph/core/dessin';

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

/** Accroches signalées par un repère : le point tombe exactement sur quelque chose d'existant. */
const ACCROCHES = new Set<Aimantage['type']>(['extremite', 'milieu', 'segment', 'alignement']);

/**
 * Guides d'alignement en pointillés et repère du point d'accroche (DES-08) : en traçant à la
 * hauteur ou à l'aplomb d'un mur existant, on voit sur quoi le point se cale.
 */
export function RepereAccroche({ aimant, mmParPx }: { aimant: Aimantage; mmParPx: number }) {
  if (!ACCROCHES.has(aimant.type)) return null;
  const { x, y } = aimant.point;
  return (
    <g pointerEvents="none" aria-hidden="true" data-testid={`accroche-${aimant.type}`}>
      <GuidesSvg guides={aimant.guides ?? []} />
      <circle
        cx={x}
        cy={y}
        r={6 * mmParPx}
        className="fill-blanc stroke-accent"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
