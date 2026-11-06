import { formatNombre } from '@ph/core/format';
import type { TendanceAffichee } from '@ph/firebase/studio';
import { Badge } from '@ph/ui';

/** Vidéos analysées, de la plus virale à la moins virale : ce sur quoi Claude s'appuie. */
export function TableTendances({ tendances }: { tendances: TendanceAffichee[] }) {
  return (
    <details className="rounded-card bg-neutre-100 px-4 py-1 open:pb-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
        Ce qui marche en ce moment ({tendances.length} vidéos analysées)
      </summary>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-neutre-700">
              {['Vidéo', 'Score viral', 'Vues', 'Vues/jour', '×abonnés', 'Engagement'].map((t) => (
                <th key={t} scope="col" className="px-2 py-2 font-semibold">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tendances.map((t) => (
              <tr key={`${t.chaine}-${t.titre}`} className="border-t border-trait">
                <td className="max-w-[340px] px-2 py-2">
                  <span className="line-clamp-2">{t.titre}</span>
                  <span className="text-xs text-neutre-700">{t.chaine}</span>
                </td>
                <td className="px-2 py-2">
                  <Badge
                    tone={
                      t.scoreViral >= 70 ? 'succes' : t.scoreViral >= 50 ? 'attention' : 'neutre'
                    }
                  >
                    {t.scoreViral}/100
                  </Badge>
                </td>
                <td className="px-2 py-2 tabular-nums">{formatNombre(t.vues)}</td>
                <td className="px-2 py-2 tabular-nums">{formatNombre(t.vuesParJour)}</td>
                <td className="px-2 py-2 tabular-nums">
                  {t.multiplicateur === null ? '—' : `×${formatNombre(t.multiplicateur, 1)}`}
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {t.engagement === null ? '—' : `${formatNombre(t.engagement * 100, 1)} %`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-2 text-xs text-neutre-700">
        ×abonnés : vues divisées par les abonnés de la chaîne. Au-dessus de ×1, la vidéo a dépassé
        son audience habituelle : c’est le meilleur signe qu’un sujet peut devenir viral.
      </p>
    </details>
  );
}
