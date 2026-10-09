import type { VERDICTS_EFFET } from '@ph/core/ia';
import { LIBELLES_STATUT_RECOMMANDATION, LIBELLES_VERDICT_EFFET } from '@ph/core/ia';
import { formatDate } from '@ph/core/format';
import type { RecommandationLue } from '@ph/firebase/ia';
import { Badge } from '@ph/ui';
import { ActionsRecommandation } from './ActionsRecommandation';
import { CopierTexte } from './CopierTexte';

const TON_PRIORITE = { 1: 'danger', 2: 'attention' } as const;
const TON_VERDICT = {
  amelioration: 'succes',
  degradation: 'danger',
  stable: 'neutre',
  indetermine: 'neutre',
} as const;
type Verdict = (typeof VERDICTS_EFFET)[number];

/** Une recommandation : preuves, proposition, actions, puis l'effet mesuré à 30 jours. */
export function CarteRecommandation({ r, peutAgir }: { r: RecommandationLue; peutAgir: boolean }) {
  const verdict = r.effet?.verdict as Verdict | undefined;
  return (
    <article
      className={`grid gap-3 rounded-card border border-trait bg-blanc p-4 ${r.statut === 'ignoree' ? 'opacity-60' : ''}`}
      aria-label={r.titre}
    >
      <p className="m-0 flex flex-wrap items-center gap-2">
        <Badge tone={TON_PRIORITE[r.priorite as 1 | 2] ?? 'neutre'}>P{r.priorite}</Badge>
        <Badge tone="succes">Gain {r.gainEstime}</Badge>
        <Badge tone="info">{r.etape}</Badge>
      </p>
      <h3 className="m-0 text-base">{r.titre}</h3>
      <p className="m-0 text-sm text-neutre-700">
        {r.perimetre} · impact {r.impact} · effort {r.effort} · confiance{' '}
        {Math.round(r.confiance * 100)} %
      </p>
      <p className="m-0">{r.constat}</p>
      <ul className="m-0 grid list-none gap-1 p-0 text-sm">
        {r.preuves.map((p, i) => (
          <li key={i}>
            <strong>{p.valeur}</strong> · {p.ref}
          </li>
        ))}
      </ul>
      {r.propositionTexte ? (
        <blockquote className="m-0 grid gap-1 rounded-control bg-neutre-100 p-3 text-sm">
          <span>
            <strong>Proposition</strong> — {r.propositionTexte}
          </span>
          <CopierTexte texte={r.propositionTexte} />
        </blockquote>
      ) : null}
      {r.statut === 'nouvelle' && peutAgir ? (
        <ActionsRecommandation id={r.id} typeAction={r.action.type} />
      ) : (
        <p className="m-0 text-sm font-semibold">
          {r.effet ? 'Faite' : (LIBELLES_STATUT_RECOMMANDATION[r.statut] ?? r.statut)}
        </p>
      )}
      {r.effet && verdict ? (
        <section aria-label="Effet mesuré" className="grid gap-1 border-t border-trait pt-3">
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={TON_VERDICT[verdict]}>{LIBELLES_VERDICT_EFFET[verdict]}</Badge>
            <span className="text-neutre-700">
              mesuré le {formatDate(r.effet.mesureLe, 'court')}
            </span>
          </p>
          <p className="m-0 text-sm">{r.effet.resume}</p>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {r.effet.mesures.map((m) => (
              <li key={m.ref}>
                {m.ref} : {m.avant} → <strong>{m.apres}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
