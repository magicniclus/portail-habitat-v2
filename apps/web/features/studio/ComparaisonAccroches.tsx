import { formatNombre } from '@ph/core/format';
import type { PublicationStudio } from '@ph/firebase/studio';

/**
 * Test A/B des accroches : vues et part regardée de chaque version publiée. La gagnante est celle
 * qui a le plus de vues, dès que toutes les versions publiées ont des résultats.
 */
export function ComparaisonAccroches({
  publications,
  variantes,
}: {
  publications: PublicationStudio[];
  variantes: { id: string; accroche: string }[];
}) {
  const versions = [{ id: null as string | null, accroche: 'Version principale' }, ...variantes]
    .map((v) => {
      const l = publications.filter((p) => p.variante === v.id && p.stats);
      const vues = l.reduce((n, p) => n + p.stats!.vues, 0);
      const ret = l.map((p) => p.stats!.retention).filter((x): x is number => x !== null);
      return {
        ...v,
        publiees: publications.filter((p) => p.variante === v.id && p.statut === 'publiee').length,
        mesurees: l.length,
        vues,
        retention: ret.length ? ret.reduce((a, b) => a + b, 0) / ret.length : null,
      };
    })
    .filter((v) => v.publiees > 0);
  if (versions.length < 2)
    return (
      <p className="m-0 text-sm text-neutre-700">
        Test des accroches : publiez au moins deux versions (une par réseau ou à des jours
        différents) pour savoir laquelle retient le mieux.
      </p>
    );
  const pret = versions.every((v) => v.mesurees > 0);
  const gagnante = pret ? [...versions].sort((a, b) => b.vues - a.vues)[0]!.id : undefined;
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="mb-1 text-left font-semibold">Test des accroches</caption>
      <thead>
        <tr className="text-left text-neutre-700">
          <th className="py-1 font-normal">Accroche</th>
          <th className="py-1 text-right font-normal">Vues</th>
          <th className="py-1 text-right font-normal">Regardé</th>
        </tr>
      </thead>
      <tbody>
        {versions.map((v) => (
          <tr key={v.id ?? 'principale'} className="border-t border-trait">
            <td className="py-1.5">
              {v.id === gagnante ? '★ ' : ''}
              {v.accroche}
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {v.mesurees ? formatNombre(v.vues) : '…'}
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {v.retention !== null ? `${Math.round(v.retention * 100)} %` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
