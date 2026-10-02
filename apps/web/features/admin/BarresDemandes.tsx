import { formatDate } from '@ph/core/format';

/**
 * Demandes reçues par jour (maquette « Admin Tableau de bord ») : une seule série, une seule
 * teinte (le dernier jour plus foncé), valeur au survol et tableau pour les lecteurs d'écran.
 */
export function BarresDemandes({ jours }: { jours: { jour: number; n: number }[] }) {
  const max = Math.max(1, ...jours.map((j) => j.n));
  return (
    <figure className="m-0 grid gap-2">
      <figcaption className="text-sm font-semibold">
        Demandes reçues par jour · 14 derniers jours
      </figcaption>
      <div aria-hidden="true" className="flex h-36 items-end gap-[2px]">
        {jours.map((j, i) => (
          <div
            key={j.jour}
            title={`${formatDate(j.jour)} : ${j.n} demande${j.n > 1 ? 's' : ''}`}
            className="group relative flex h-full flex-1 items-end"
          >
            <div
              className={`w-full rounded-t-[4px] ${i === jours.length - 1 ? 'bg-accent' : 'bg-accent-300'}`}
              style={{ height: `${Math.max(2, (j.n / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Demandes reçues par jour</caption>
        <tbody>
          {jours.map((j) => (
            <tr key={j.jour}>
              <th scope="row">{formatDate(j.jour)}</th>
              <td>{j.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
