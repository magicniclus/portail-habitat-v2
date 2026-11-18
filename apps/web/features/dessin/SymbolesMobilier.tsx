'use client';

/** Lit et canapé vus de dessus (dos du côté y = -p/2). */
const t = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.2 };
interface Props {
  l: number;
  p: number;
  couleur: string;
}

export function Lit({ l, p, couleur }: Props) {
  const x = -l / 2;
  const y = -p / 2;
  return (
    <g>
      <rect x={x} y={y} width={l} height={p} fill={couleur} {...t} />
      {l >= 1200 ? (
        <>
          <rect
            x={x + l * 0.06}
            y={y + p * 0.04}
            width={l * 0.4}
            height={p * 0.12}
            rx={40}
            fill="none"
            {...t}
          />
          <rect
            x={l * 0.04}
            y={y + p * 0.04}
            width={l * 0.4}
            height={p * 0.12}
            rx={40}
            fill="none"
            {...t}
          />
        </>
      ) : (
        <rect
          x={x + l * 0.1}
          y={y + p * 0.04}
          width={l * 0.8}
          height={p * 0.12}
          rx={40}
          fill="none"
          {...t}
        />
      )}
      <line x1={x} y1={y + p * 0.3} x2={-x} y2={y + p * 0.3} {...t} />
    </g>
  );
}

export function Canape({ l, p, couleur }: Props) {
  const x = -l / 2;
  const y = -p / 2;
  return (
    <g>
      <rect x={x} y={y} width={l} height={p} fill={couleur} {...t} />
      <rect x={x} y={y} width={l} height={p * 0.25} fill="none" {...t} />
      <rect x={x} y={y} width={l * 0.1} height={p} fill="none" {...t} />
      <rect x={-x - l * 0.1} y={y} width={l * 0.1} height={p} fill="none" {...t} />
    </g>
  );
}
