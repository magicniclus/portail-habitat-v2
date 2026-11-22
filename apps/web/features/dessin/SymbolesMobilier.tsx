import { formeObjet3D } from '@ph/core/dessin';

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

/**
 * Meuble vu de dessus, tiré de son volume 3D (canapés, bureaux) : chaque bloc en plan, du plus
 * bas au plus haut ; les pieds et petits détails ne sont pas dessinés.
 */
export function VueDessus({
  symbole,
  l,
  p,
  couleur,
  style,
}: Props & { symbole: 'canape' | 'bureau' | 'table' | 'table_ronde'; style?: string }) {
  const blocs = formeObjet3D(symbole, { l, p, h: 850 }, style)
    .filter((f) => !f.pente && f.taille.l > 60 && f.taille.p > 60)
    .sort((a, b) => a.centre.z + a.taille.h / 2 - (b.centre.z + b.taille.h / 2));
  return (
    <g>
      {blocs.map((f, i) =>
        f.forme === 'cylindre' ? (
          <circle
            key={i}
            cx={f.centre.x}
            cy={f.centre.y}
            r={f.taille.l / 2}
            fill={couleur}
            {...t}
          />
        ) : (
          <rect
            key={i}
            x={f.centre.x - f.taille.l / 2}
            y={f.centre.y - f.taille.p / 2}
            width={f.taille.l}
            height={f.taille.p}
            rx={Math.min(f.arrondi ?? 0, 80)}
            fill={couleur}
            {...t}
          />
        ),
      )}
    </g>
  );
}
