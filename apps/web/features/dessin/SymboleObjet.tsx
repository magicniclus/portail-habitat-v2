import type { SymboleObjet } from '@ph/core/dessin';
import { SymboleAmenagement } from './SymbolesAmenagement';
import { Canape, Lit } from './SymbolesMobilier';

/**
 * Symbole d'un objet vu de dessus, dans son repère : centre en (0, 0), largeur l (x),
 * profondeur p (y), dos du côté y = -p/2. Traits d'épaisseur constante à l'écran.
 */
const t = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.2 };

export function SymboleObjetSvg({
  symbole,
  l,
  p,
  couleur,
}: {
  symbole: SymboleObjet;
  l: number;
  p: number;
  couleur: string;
}) {
  const x = -l / 2;
  const y = -p / 2;
  const cadre = (extra: object = {}) => (
    <rect x={x} y={y} width={l} height={p} fill={couleur} {...t} {...extra} />
  );
  const m = Math.min(l, p);
  switch (symbole) {
    case 'rond':
    case 'table_ronde':
      return <ellipse rx={l / 2} ry={p / 2} fill={couleur} {...t} />;
    case 'plante':
      return (
        <g>
          <circle r={m / 2} fill={couleur} {...t} />
          <circle r={m / 5} fill="none" {...t} />
          {[0, 60, 120].map((a) => (
            <line key={a} x1={0} y1={-m / 2} x2={0} y2={m / 2} transform={`rotate(${a})`} {...t} />
          ))}
        </g>
      );
    case 'point_lumineux':
      return (
        <g>
          <circle r={m / 2} fill={couleur} {...t} />
          <line x1={-m / 3} y1={-m / 3} x2={m / 3} y2={m / 3} {...t} />
          <line x1={m / 3} y1={-m / 3} x2={-m / 3} y2={m / 3} {...t} />
        </g>
      );
    case 'tapis':
      return cadre({ fillOpacity: 0.5, strokeDasharray: '6 4' });
    case 'meuble_haut':
    case 'hotte':
      return (
        <g>
          {cadre({ fillOpacity: 0.35, strokeDasharray: '6 4' })}
          {symbole === 'hotte' ? <line x1={x} y1={y} x2={-x} y2={-y} {...t} /> : null}
        </g>
      );
    case 'colonne':
    case 'armoire':
      return (
        <g>
          {cadre()}
          <line x1={x} y1={y} x2={-x} y2={-y} {...t} />
          {symbole === 'colonne' ? <line x1={-x} y1={y} x2={x} y2={-y} {...t} /> : null}
        </g>
      );
    case 'evier':
    case 'vasque':
    case 'baignoire':
      return (
        <g>
          {cadre()}
          <rect
            x={x + l * 0.12}
            y={y + p * 0.15}
            width={l * (symbole === 'evier' ? 0.4 : 0.76)}
            height={p * 0.7}
            rx={m * 0.15}
            fill="none"
            {...t}
          />
        </g>
      );
    case 'plaque':
      return (
        <g>
          {cadre()}
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([i, j]) => (
            <circle
              key={`${i}${j}`}
              cx={(i! * l) / 4}
              cy={(j! * p) / 4}
              r={m / 7}
              fill="none"
              {...t}
            />
          ))}
        </g>
      );
    case 'douche':
      return (
        <g>
          {cadre()}
          <line x1={x} y1={y} x2={-x} y2={-y} {...t} />
          <line x1={-x} y1={y} x2={x} y2={-y} {...t} />
          <circle r={m / 12} fill={couleur} {...t} />
        </g>
      );
    case 'wc':
      return (
        <g>
          <rect x={x} y={y} width={l} height={p * 0.3} fill={couleur} {...t} />
          <ellipse cy={p * 0.15} rx={l * 0.45} ry={p * 0.33} fill={couleur} {...t} />
        </g>
      );
    case 'lit':
      return <Lit l={l} p={p} couleur={couleur} />;
    case 'canape':
      return <Canape l={l} p={p} couleur={couleur} />;
    case 'chaise':
      return (
        <g>
          {cadre()}
          <rect x={x} y={y} width={l} height={p * 0.15} fill="none" {...t} />
        </g>
      );
    case 'radiateur':
      return (
        <g>
          {cadre()}
          {Array.from({ length: Math.max(1, Math.floor(l / 100) - 1) }, (_, i) => (
            <line key={i} x1={x + (i + 1) * 100} y1={y} x2={x + (i + 1) * 100} y2={-y} {...t} />
          ))}
        </g>
      );
    case 'prise':
    case 'interrupteur':
      return (
        <g>
          {cadre()}
          <circle cx={symbole === 'prise' ? -l / 5 : 0} r={m / 6} fill="none" {...t} />
          {symbole === 'prise' ? <circle cx={l / 5} r={m / 6} fill="none" {...t} /> : null}
        </g>
      );
    case 'frigo':
    case 'lave_vaisselle':
      return (
        <g>
          {cadre()}
          <line x1={x} y1={-y - p * 0.12} x2={-x} y2={-y - p * 0.12} {...t} />
        </g>
      );
    default:
      // Rectangle simple, ou symbole des meubles et aménagements au dessin simple.
      return <SymboleAmenagement symbole={symbole} l={l} p={p} couleur={couleur} />;
  }
}
