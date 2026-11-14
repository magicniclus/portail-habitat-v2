import { ACTIONS_REDACTION, LIBELLES_ACTION_REDACTION, type StatsRedaction } from '@ph/core/ia';
import { formatEuros } from '@ph/core/format';

/** Aide à la rédaction des artisans (IA_ADMIN §8) : usage et taux d'acceptation sur 30 jours. */
export function UsageRedaction({ stats }: { stats: StatsRedaction }) {
  return (
    <section
      aria-labelledby="usage-redaction"
      className="grid gap-2 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="usage-redaction" className="m-0 text-base">
        Aide à la rédaction · 30 jours
      </h2>
      {stats.total ? (
        <>
          <p className="m-0 text-sm">
            <strong className="text-[22px]">{stats.tauxAcceptation} %</strong> des propositions
            reprises ({stats.acceptees} sur {stats.total}) · coût{' '}
            {formatEuros(stats.coutCentimes, { decimales: 'toujours' })}
          </p>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm text-neutre-800">
            {ACTIONS_REDACTION.map((a) => (
              <li key={a} className="flex justify-between gap-3">
                <span>{LIBELLES_ACTION_REDACTION[a]}</span>
                <span>
                  {stats.parAction[a].acceptees} / {stats.parAction[a].total}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="m-0 text-sm text-neutre-700">Aucune utilisation sur les 30 derniers jours.</p>
      )}
    </section>
  );
}
