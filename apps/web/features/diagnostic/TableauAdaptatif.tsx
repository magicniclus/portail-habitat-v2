/**
 * Tableau des maquettes ; sous 640 px il devient une liste de cartes empilées (MOBILE §7),
 * sans défilement horizontal. La première colonne sert de titre de carte.
 */
export function TableauAdaptatif({
  legende,
  colonnes,
  lignes,
}: {
  legende: string;
  colonnes: readonly string[];
  lignes: readonly (readonly string[])[];
}) {
  return (
    <>
      <table className="hidden w-full border-collapse text-left text-[14.5px] sm:table">
        <caption className="sr-only">{legende}</caption>
        <thead>
          <tr className="border-b-2 border-trait">
            {colonnes.map((c) => (
              <th key={c} scope="col" className="px-3 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l[0]} className="border-b border-trait align-top">
              {l.map((cellule, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="px-3 py-3 font-bold">
                    {cellule}
                  </th>
                ) : (
                  <td
                    key={i}
                    className={`px-3 py-3 ${i === l.length - 1 ? 'whitespace-nowrap' : ''}`}
                  >
                    {cellule}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <ul aria-label={legende} className="m-0 grid list-none gap-3 p-0 sm:hidden">
        {lignes.map((l) => (
          <li key={l[0]} className="rounded-card border border-trait p-4">
            <p className="m-0 mb-2 font-bold">{l[0]}</p>
            <dl className="m-0 grid gap-1.5 text-[14.5px]">
              {l.slice(1).map((cellule, i) => (
                <div key={i} className="flex flex-wrap justify-between gap-x-3">
                  <dt className="text-neutre-700">{colonnes[i + 1]}</dt>
                  <dd className="m-0 text-right">{cellule}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
