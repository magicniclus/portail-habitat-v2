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
 * Canapé vu de dessus, tiré de son volume 3D : chaque bloc (assise, coussins, accoudoirs,
 * retour d'angle) en plan, du plus bas au plus haut ; les pieds ne sont pas dessinés.
 */
export function Canape({ l, p, couleur, style }: Props & { style?: string }) {
  const blocs = formeObjet3D('canape', { l, p, h: 850 }, style)
    .filter((f) => f.forme === 'boite' && f.taille.l > 60 && f.taille.p > 60)
    .sort((a, b) => a.centre.z - b.centre.z);
  return (
    <g>
      {blocs.map((f, i) => (
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
      ))}
    </g>
  );
}
