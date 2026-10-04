import { formatEuros } from '@ph/core/format';
import type { FinancesAdmin } from '@ph/firebase/admin-serveur';

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

/** Indicateurs de la maquette « Admin Finances ». */
export function IndicateursFinances({ f }: { f: FinancesAdmin }) {
  const tuiles: [string, string, string][] = [
    ['MRR', formatEuros(f.mrr, { suffixe: 'HT' }), 'abonnements actifs, ramenés au mois'],
    [
      'Abonnés Premium',
      String(f.abonnes.premium),
      `${pct(f.abonnes.premiumAnnuel, f.abonnes.premium)} % en annuel`,
    ],
    [
      'Abonnés Visibilité',
      String(f.abonnes.visibilite),
      `${pct(f.abonnes.visibiliteAnnuel, f.abonnes.visibilite)} % en annuel`,
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
