import type { TypeEscalier } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { ReactNode } from 'react';
import { Vignette } from './Apercus';

const t = { stroke: COULEURS_PLAN.mur, strokeWidth: 1.2, fill: 'none' } as const;
const m = { stroke: COULEURS_PLAN.mur, strokeWidth: 0.6 } as const;

/** Volée droite de `n` marches dans un rectangle, de (x, y) vers le haut. */
const marches = (x: number, y: number, l: number, h: number, n: number) =>
  Array.from({ length: n - 1 }, (_, i) => (
    <line
      key={`${x}-${y}-${i}`}
      x1={x}
      y1={y + ((i + 1) * h) / n}
      x2={x + l}
      y2={y + ((i + 1) * h) / n}
      {...m}
    />
  ));

/** Escaliers vus de dessus, comme sur le plan : contour, marches et flèche de montée. */
const DESSINS: Record<TypeEscalier, ReactNode> = {
  droit: (
    <g>
      <rect x={13} y={4} width={14} height={32} {...t} />
      {marches(13, 4, 14, 32, 8)}
      <path d="M20 33V8m-3 3l3-3 3 3" {...m} strokeWidth={1} fill="none" />
    </g>
  ),
  quart_bas: (
    <g>
      <path d="M6 36h14V4h14v32" {...t} />
      <rect x={6} y={22} width={14} height={14} {...t} />
      {marches(20, 4, 14, 32, 8)}
      <path d="M8 29h19V8m-3 3l3-3 3 3" {...m} strokeWidth={1} fill="none" />
    </g>
  ),
  quart_haut: (
    <g>
      <rect x={20} y={4} width={14} height={32} {...t} />
      <rect x={6} y={4} width={14} height={14} {...t} />
      {marches(20, 4, 14, 32, 8)}
      <path d="M27 33V11H8m3-3l-3 3 3 3" {...m} strokeWidth={1} fill="none" />
    </g>
  ),
  deux_quarts: (
    <g>
      <rect x={6} y={4} width={13} height={32} {...t} />
      <rect x={21} y={4} width={13} height={32} {...t} />
      {marches(6, 12, 13, 24, 6)}
      {marches(21, 12, 13, 24, 6)}
      <line x1={6} y1={12} x2={34} y2={12} {...t} />
      <path d="M12 33V8h15v25m-3-3l3 3 3-3" {...m} strokeWidth={1} fill="none" />
    </g>
  ),
  helicoidal: (
    <g>
      <circle cx={20} cy={20} r={15} {...t} />
      <circle cx={20} cy={20} r={2.5} {...t} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return (
          <line
            key={i}
            x1={20 + 2.5 * Math.cos(a)}
            y1={20 + 2.5 * Math.sin(a)}
            x2={20 + 15 * Math.cos(a)}
            y2={20 + 15 * Math.sin(a)}
            {...m}
          />
        );
      })}
    </g>
  ),
  meunier: (
    <g>
      <rect x={15} y={4} width={10} height={32} {...t} />
      {marches(15, 4, 10, 32, 6)}
      <path d="M20 33V8m-2.5 2.5L20 8l2.5 2.5" {...m} strokeWidth={1} fill="none" />
    </g>
  ),
};

/** Vignette d'un type d'escalier, en symbole de plan. */
export function ApercuEscalier({ type }: { type: TypeEscalier }) {
  return <Vignette vue="0 0 40 40">{DESSINS[type]}</Vignette>;
}
