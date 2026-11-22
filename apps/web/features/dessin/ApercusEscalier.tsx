import type { ModeleEscalier, TypeEscalier } from '@ph/core/dessin';
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

const epais = { stroke: COULEURS_PLAN.mur, strokeWidth: 2.4, fill: 'none' } as const;
const fleche = (d: string) => <path d={d} {...m} strokeWidth={1} fill="none" />;

/** Vignettes des modèles du menu Escaliers : ce qui les distingue, vu de dessus. */
const MODELES: Record<ModeleEscalier, ReactNode> = {
  limons: (
    <g>
      {marches(14, 4, 12, 32, 8)}
      <line x1={13} y1={4} x2={13} y2={36} {...epais} />
      <line x1={27} y1={4} x2={27} y2={36} {...epais} />
      {fleche('M20 33V8m-3 3l3-3 3 3')}
    </g>
  ),
  balance: (
    <g>
      <path d="M6 36V12a6 6 0 0 1 6-6h22v13H19v17z" {...t} />
      {marches(6, 22, 13, 14, 3)}
      <line x1={19} y1={19} x2={6} y2={14} {...m} />
      <line x1={19} y1={19} x2={10} y2={7} {...m} />
      <line x1={19} y1={19} x2={17} y2={6} {...m} />
      {[23, 27, 31].map((x) => (
        <line key={x} x1={x} y1={6} x2={x} y2={19} {...m} />
      ))}
      {fleche('M12 33V14q0-1 1-1h18m-3-3 3 3-3 3')}
    </g>
  ),
  palier: (
    <g>
      <path d="M6 36V6h28v13H19v17z" {...t} />
      <rect x={6} y={6} width={13} height={13} {...t} />
      {marches(6, 19, 13, 17, 4)}
      {[23, 27, 31].map((x) => (
        <line key={x} x1={x} y1={6} x2={x} y2={19} {...m} />
      ))}
      {fleche('M12 33V12h19m-3-3 3 3-3 3')}
    </g>
  ),
  suspendu: (
    <g>
      <rect x={9} y={4} width={3} height={32} fill={COULEURS_PLAN.mur} />
      {[6, 11, 16, 21, 26, 31].map((y) => (
        <rect key={y} x={12} y={y} width={16} height={3} {...t} />
      ))}
      {fleche('M20 34V9m-3 3l3-3 3 3')}
    </g>
  ),
  central: (
    <g>
      <rect x={13} y={4} width={14} height={32} {...t} />
      {marches(13, 4, 14, 32, 8)}
      <line x1={20} y1={4} x2={20} y2={36} {...epais} strokeWidth={3.2} />
    </g>
  ),
  colimacon: DESSINS.helicoidal,
  meunier: DESSINS.meunier,
};

/** Vignette d'un modèle d'escalier (menu, inspecteur). */
export function ApercuModeleEscalier({ modele }: { modele: ModeleEscalier }) {
  return <Vignette vue="0 0 40 40">{MODELES[modele]}</Vignette>;
}
