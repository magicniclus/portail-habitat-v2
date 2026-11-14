import { formatDate, formatNombre } from '@ph/core/format';

export interface PointHistogramme {
  debut: string;
  fin: string;
  valeur: number;
}

const midi = (j: string) => `${j}T12:00:00Z`;

/**
 * Histogramme d'une seule série (couleur d'accent) : barres fines arrondies en haut, 2 px
 * d'écart, valeur au survol ou au focus, seule la dernière barre étiquetée, grille discrète et
 * tableau équivalent pour les lecteurs d'écran.
 */
export function Histogramme({
  titre,
  unite,
  points,
  pas,
}: {
  titre: string;
  /** « vues », « appels »… pour le total et les infobulles. */
  unite: string;
  points: PointHistogramme[];
  pas: 'jour' | 'mois';
}) {
  const maxi = Math.max(1, ...points.map((p) => p.valeur));
  const total = points.reduce((n, p) => n + p.valeur, 0);
  const periode = (p: PointHistogramme) =>
    pas === 'mois' ? formatDate(midi(p.debut), 'moisAnnee') : formatDate(midi(p.debut), 'long');
  // Étiquettes de l'axe : toutes sur 7 jours et 12 mois, une sur cinq sur 30 jours.
  const etiquette = (i: number) =>
    points.length <= 12 || i % 5 === (points.length - 1) % 5
      ? formatDate(midi(points[i]!.debut), pas === 'mois' ? 'moisCourt' : 'jourMois')
      : '';
  return (
    <figure className="m-0 grid gap-2 rounded-2xl border border-trait p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{titre}</span>
        <span className="text-2xl font-bold tabular-nums">{formatNombre(total)}</span>
      </figcaption>
      <div className="relative mt-6 h-[140px]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 border-t border-dashed border-trait"
        />
        <div className="absolute inset-0 flex items-end gap-0.5 border-b border-trait">
          {points.map((p, i) => {
            const derniere = i === points.length - 1;
            return (
              <div
                key={p.debut}
                role="img"
                tabIndex={0}
                aria-label={`${periode(p)} : ${formatNombre(p.valeur)} ${unite}`}
                className="group relative flex h-full flex-1 flex-col items-center justify-end outline-offset-2"
              >
                {derniere && p.valeur > 0 ? (
                  <span className="mb-0.5 text-xs font-bold text-texte">
                    {formatNombre(p.valeur)}
                  </span>
                ) : null}
                <span
                  className="block w-full max-w-8 rounded-t-[4px] bg-accent opacity-80 group-hover:opacity-100 group-focus:opacity-100"
                  style={{
                    height: `${p.valeur ? Math.max(3, Math.round((p.valeur / maxi) * 110)) : 0}px`,
                  }}
                />
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-texte px-2 py-1 text-xs text-blanc group-hover:block group-focus:block">
                  {formatNombre(p.valeur)} {unite} · {periode(p)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="flex gap-0.5 text-center text-[11px] text-neutre-700">
        {points.map((p, i) => (
          <span key={p.debut} className="flex-1 overflow-visible whitespace-nowrap">
            {etiquette(i)}
          </span>
        ))}
      </div>
      {/* Le div porte le masquage : sur un <table>, la hauteur n'est pas limitée et la page s'allongeait. */}
      <div className="sr-only">
        <table>
          <caption>{titre}</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.debut}>
                <th scope="row">{periode(p)}</th>
                <td>{p.valeur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
