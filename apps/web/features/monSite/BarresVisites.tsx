import { formatNombre } from '@ph/core/format';

/**
 * Visites par période (une seule série, couleur d'accent) : barres fines ancrées sur la ligne de
 * base, info-bulle par barre, et le même chiffre dans un tableau (jamais la couleur seule).
 */
export function BarresVisites({
  titre,
  serie,
  libelle,
}: {
  titre: string;
  serie: { cle: string; vues: number }[];
  libelle: (cle: string) => string;
}) {
  const max = Math.max(1, ...serie.map((p) => p.vues));
  return (
    <figure className="m-0 grid gap-2">
      <figcaption className="font-semibold">{titre}</figcaption>
      <div
        aria-hidden="true"
        className="flex h-40 items-end gap-[2px] border-b border-neutre-300 pt-2"
      >
        {serie.map((p) => (
          <div
            key={p.cle}
            title={`${libelle(p.cle)} : ${formatNombre(p.vues)} visite${p.vues > 1 ? 's' : ''}`}
            className="group flex h-full min-w-0 flex-1 items-end"
          >
            <div
              className="w-full rounded-t-[4px] bg-accent-action group-hover:bg-accent-800"
              style={{ height: `${p.vues ? Math.max(2, (p.vues / max) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex justify-between text-sm text-neutre-800">
        <span>{libelle(serie[0]?.cle ?? '')}</span>
        <span>{libelle(serie.at(-1)?.cle ?? '')}</span>
      </div>
      <details className="text-[15px]">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Voir le tableau</summary>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="py-1 text-left">Période</th>
              <th className="py-1 text-right">Visites</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((p) => (
              <tr key={p.cle} className="border-t border-trait">
                <td className="py-1">{libelle(p.cle)}</td>
                <td className="py-1 text-right tabular-nums">{formatNombre(p.vues)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
