import type { SymboleObjet } from '@ph/core/dessin';

/**
 * Symboles vus de dessus des meubles et aménagements au dessin simple (îlot, tabouret, buffet,
 * étagère, banc, four, pergola, carport, serre, abri, transat, parasol, jardinière), sinon un
 * simple rectangle. Repère : centre en (0, 0), largeur l (x), profondeur p (y), dos en y = -p/2.
 */
const t = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.2 };
const vide = { ...t, fill: 'none' };

/** Positions régulières entre deux bords, bords exclus. */
const entre = (debut: number, longueur: number, pas: number) => {
  const n = Math.max(1, Math.round(longueur / pas));
  return Array.from({ length: n - 1 }, (_, i) => debut + ((i + 1) * longueur) / n);
};

export function SymboleAmenagement({
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
  const [x, y, m] = [-l / 2, -p / 2, Math.min(l, p)];
  const cadre = (extra: object = {}) => (
    <rect x={x} y={y} width={l} height={p} fill={couleur} {...t} {...extra} />
  );
  const ligne = (x1: number, y1: number, x2: number, y2: number, k: string | number = 0) => (
    <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} {...t} />
  );
  const poteaux = (c: number) =>
    [x, -x - c].flatMap((px) =>
      [y, -y - c].map((py) => (
        <rect key={`${px}-${py}`} x={px} y={py} width={c} height={c} fill={couleur} {...t} />
      )),
    );
  switch (symbole) {
    case 'ilot': {
      const caisson = Math.max(400, p - 300);
      return (
        <g>
          {cadre()}
          <line x1={x} y1={y + caisson} x2={-x} y2={y + caisson} {...t} strokeDasharray="6 4" />
        </g>
      );
    }
    case 'tabouret':
    case 'parasol':
      return (
        <g>
          <ellipse rx={l / 2} ry={p / 2} fill={couleur} {...t} />
          {symbole === 'parasol'
            ? [0, 45, 90, 135].map((a) => (
                <line key={a} x1={-m / 2} x2={m / 2} transform={`rotate(${a})`} {...t} />
              ))
            : null}
        </g>
      );
    case 'buffet':
    case 'four':
      return (
        <g>
          {cadre()}
          {ligne(x, -y - p * 0.12, -x, -y - p * 0.12)}
        </g>
      );
    case 'etagere':
      return (
        <g>
          {cadre()}
          <rect x={x + 20} y={y} width={l - 40} height={p} {...vide} />
        </g>
      );
    case 'banc':
    case 'jardiniere':
      return (
        <g>
          {cadre()}
          {symbole === 'banc' ? (
            <>
              {ligne(x + 125, y, x + 125, -y, 'a')}
              {ligne(-x - 125, y, -x - 125, -y, 'b')}
            </>
          ) : (
            <rect x={x + 40} y={y + 40} width={l - 80} height={p - 80} {...vide} />
          )}
        </g>
      );
    case 'transat':
      return (
        <g>
          {cadre()}
          {ligne(x, y + p * 0.3, -x, y + p * 0.3)}
        </g>
      );
    case 'pergola':
      return (
        <g>
          {cadre({ fillOpacity: 0.35 })}
          {entre(x, l, 400).map((lx, i) => ligne(lx, y, lx, -y, i))}
          {poteaux(120)}
        </g>
      );
    case 'carport':
      return (
        <g>
          {cadre({ fillOpacity: 0.5 })}
          {ligne(x, y, -x, -y, 'a')}
          {ligne(-x, y, x, -y, 'b')}
          {poteaux(100)}
        </g>
      );
    case 'serre':
    case 'abri':
      return (
        <g>
          {cadre(symbole === 'serre' ? { fillOpacity: 0.4 } : {})}
          {ligne(x, 0, -x, 0)}
        </g>
      );
    default:
      return cadre();
  }
}
