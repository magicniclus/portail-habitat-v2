import { FORMULES_PAYANTES, NOMS_FORMULE } from '@ph/core/paiements';
import { formatEuros } from '@ph/core/format';
import type { FinancesAdmin } from '@ph/firebase/admin-serveur';

/** Indicateurs de la maquette « Admin Finances ». */
export function IndicateursFinances({ f }: { f: FinancesAdmin }) {
  const tuiles: [string, string, string][] = [
    ['MRR', formatEuros(f.mrr, { suffixe: 'HT' }), 'abonnements actifs, ramenés au mois'],
    [
      'Abonnés',
      String(FORMULES_PAYANTES.reduce((n, x) => n + f.abonnes[x], 0)),
      FORMULES_PAYANTES.map((x) => `${NOMS_FORMULE[x]} ${f.abonnes[x]}`).join(' · '),
    ],
    [
      'Appels d’offres (30 j)',
      formatEuros(f.appelsOffres30j.ht, { suffixe: 'HT' }),
      `${f.appelsOffres30j.deblocages} déblocages`,
    ],
  ];
  return (
    <ul
      aria-label="Indicateurs"
      className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4"
    >
      {tuiles.map(([l, v, s]) => (
        <li key={l} className="grid gap-1 rounded-[12px] border border-trait bg-blanc p-4">
          <span className="text-sm text-neutre-700">{l}</span>
          <strong className="text-2xl">{v}</strong>
          <span className="text-[13px] text-neutre-700">{s}</span>
        </li>
      ))}
    </ul>
  );
}
