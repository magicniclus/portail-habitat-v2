import { formatDate, formatNombre } from '@ph/core/format';

interface Semaine {
  debut: string;
  fin: string;
  vues: number;
}

const libelle = (s: Semaine) => `du ${formatDate(s.debut)} au ${formatDate(s.fin)}`;

/**
 * Vues par semaine (8 semaines) : une seule série, couleur d'accent, barres fines arrondies en
 * haut ; valeur au survol ou au focus de chaque barre, dernière semaine étiquetée, tableau
 * équivalent pour les lecteurs d'écran.
 */
export function VuesParSemaine({ semaines }: { semaines: Semaine[] }) {
  const maxi = Math.max(1, ...semaines.map((s) => s.vues));
  return (
    <figure className="m-0 grid gap-3">
      <div aria-hidden="true" className="flex h-[150px] items-end gap-0.5 border-b border-trait">
        {semaines.map((s, i) => {
          const derniere = i === semaines.length - 1;
          return (
            <div
              key={s.fin}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {derniere ? (
                <span className="mb-1 text-xs font-bold text-texte">{formatNombre(s.vues)}</span>
              ) : null}
              <span
                className={`block w-full max-w-10 rounded-t-[4px] ${derniere ? 'bg-accent' : 'bg-accent-300'} group-hover:bg-accent-700`}
                style={{ height: `${Math.max(2, Math.round((s.vues / maxi) * 120))}px` }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md bg-texte px-2 py-1 text-xs whitespace-nowrap text-blanc group-hover:block">
                {formatNombre(s.vues)} vues · {libelle(s)}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="flex gap-0.5 text-center text-xs text-neutre-700">
        {semaines.map((s, i) => (
          <span key={s.fin} className="flex-1">
            S{i + 1}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Vues de la fiche par semaine</caption>
        <thead>
          <tr>
            <th scope="col">Semaine</th>
            <th scope="col">Vues</th>
          </tr>
        </thead>
        <tbody>
          {semaines.map((s) => (
            <tr key={s.fin}>
              <th scope="row">{libelle(s)}</th>
              <td>{s.vues}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
