import type { SimulationBareme } from '@ph/core/admin';
import { formatEuros } from '@ph/core/format';

const e = (c: number) => formatEuros(c, { suffixe: 'HT' });

/** ADM-05 : effet du barème saisi sur les derniers leads, avant publication. */
export function TableauSimulation({ s }: { s: SimulationBareme }) {
  return (
    <section aria-label="Simulation" className="grid gap-2">
      <p className="m-0 font-semibold">
        {s.lignes.length} derniers leads : prix moyen {e(s.moyenneAvant)} → {e(s.moyenneApres)} ·{' '}
        {s.hausses} en hausse · {s.baisses} en baisse
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-neutre-700">
              <th className="py-2 pr-3 font-semibold">Lead</th>
              <th className="py-2 pr-3 font-semibold">Actuel</th>
              <th className="py-2 pr-3 font-semibold">Nouveau</th>
              <th className="py-2 font-semibold">Écart</th>
            </tr>
          </thead>
          <tbody>
            {s.lignes.map((l) => (
              <tr key={l.id} className="border-t border-trait">
                <td className="py-2 pr-3">{l.titre}</td>
                <td className="py-2 pr-3">{e(l.avant)}</td>
                <td className="py-2 pr-3">{e(l.apres)}</td>
                <td className="py-2">
                  {l.ecart > 0 ? '+' : ''}
                  {formatEuros(l.ecart)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
