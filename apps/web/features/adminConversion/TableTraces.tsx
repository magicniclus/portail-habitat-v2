import { libelleTrace, RAISONS_NON_ENVOI } from '@ph/core/conversion';
import { formatDate } from '@ph/core/format';
import type { TraceCycle } from '@ph/firebase/admin-serveur';
import { StatusBadge } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';

/** Détail lisible d'une trace : raison d'un non-envoi, sinon les détails utiles. */
function detail(t: TraceCycle): string {
  if (t.raison) return `Raison : ${RAISONS_NON_ENVOI[t.raison] ?? t.raison}`;
  return Object.entries(t.details)
    .filter(([, v]) => ['string', 'number'].includes(typeof v))
    .map(([k, v]) => `${k} : ${String(v)}`)
    .join(' · ');
}

/** Traces du moteur (`cycleTraces`) : chaque décision, y compris les non-envois. */
export function TableTraces({
  traces,
  lienFiche = true,
}: {
  traces: TraceCycle[];
  lienFiche?: boolean;
}) {
  if (!traces.length) return <p className="m-0 text-sm">Aucune trace pour ce filtre.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-trait text-neutre-700">
            <th className="py-2 pr-3 font-semibold">Date</th>
            {lienFiche ? <th className="py-2 pr-3 font-semibold">Entreprise</th> : null}
            <th className="py-2 pr-3 font-semibold">Type</th>
            <th className="py-2 pr-3 font-semibold">Modèle</th>
            <th className="py-2 pr-3 font-semibold">Détail</th>
            <th className="py-2 font-semibold">Fonction</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((t) => (
            <tr key={t.id} className="border-b border-trait align-top">
              <td className="py-2 pr-3 whitespace-nowrap">{formatDate(t.le, 'dateHeure')}</td>
              {lienFiche ? (
                <td className="py-2 pr-3">
                  {t.artisanId ? (
                    <Link
                      href={`/admin/conversion/fiche/${t.artisanId}` as Route}
                      className="text-accent-700 underline"
                    >
                      {t.entreprise}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              ) : null}
              <td className="py-2 pr-3">
                <StatusBadge statut={libelleTrace(t.type)} />
              </td>
              <td className="py-2 pr-3">{t.modele ?? '—'}</td>
              <td className="py-2 pr-3">{detail(t)}</td>
              <td className="py-2 text-neutre-700">{t.fonction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
