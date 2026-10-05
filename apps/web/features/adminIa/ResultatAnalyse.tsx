import {
  LIBELLES_PERIMETRE_IA,
  LIBELLES_STATUT_RECOMMANDATION,
  type PerimetreIa,
} from '@ph/core/ia';
import { formatDate, formatEuros } from '@ph/core/format';
import type { AnalyseLue, RecommandationLue } from '@ph/firebase/ia';
import { Badge } from '@ph/ui';
import { ActionsRecommandation } from './ActionsRecommandation';

const carte = 'grid gap-3 rounded-card border border-trait bg-blanc p-4';
const TON_PRIORITE = { 1: 'danger', 2: 'attention' } as const;

/** Résultat d'une analyse : résumé, audit de l'entonnoir, recommandations avec preuves. */
export function ResultatAnalyse({
  analyse,
  recommandations,
  peutAgir,
}: {
  analyse: AnalyseLue;
  recommandations: RecommandationLue[];
  peutAgir: boolean;
}) {
  const perimetres = analyse.perimetres
    .map((p) => LIBELLES_PERIMETRE_IA[p as PerimetreIa] ?? p)
    .join(', ');
  return (
    <div className="grid gap-4">
      <section aria-labelledby="resume-ia" className={carte}>
        <h2 id="resume-ia" className="m-0 text-lg">
          {analyse.mode === 'audit' ? 'Audit complet' : 'Points d’amélioration'}
        </h2>
        <p className="m-0 text-sm text-neutre-700">
          {formatDate(analyse.createdAt, 'long')} · {perimetres} · {recommandations.length}{' '}
          recommandations · {formatEuros(analyse.coutCentimes, { decimales: 'toujours' })}
        </p>
        {analyse.question ? <p className="m-0 italic">« {analyse.question} »</p> : null}
        <p className="m-0">{analyse.resume}</p>
        {analyse.gainTotal ? (
          <p className="m-0 font-semibold">
            Gain total estimé si tout est appliqué : {analyse.gainTotal}
          </p>
        ) : null}
      </section>
      {analyse.etapes.length ? (
        <section aria-labelledby="entonnoir-ia" className={carte}>
          <h2 id="entonnoir-ia" className="m-0 text-lg">
            Audit de l’entonnoir de conversion
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0">
            {analyse.etapes.map((e) => (
              <li key={e.etape} className="grid gap-1">
                <span className="flex justify-between gap-2 font-semibold">
                  {e.etape}
                  <span>{e.score} / 100</span>
                </span>
                <meter
                  min={0}
                  max={100}
                  low={55}
                  high={65}
                  optimum={100}
                  value={e.score}
                  className="h-2 w-full"
                />
                <span className="text-sm text-neutre-800">{e.constat}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {recommandations.map((r) => (
        <article
          key={r.id}
          className={`${carte} ${r.statut === 'ignoree' ? 'opacity-60' : ''}`}
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
            <blockquote className="m-0 rounded-control bg-neutre-100 p-3 text-sm">
              <strong>Proposition</strong> — {r.propositionTexte}
            </blockquote>
          ) : null}
          {r.statut === 'nouvelle' && peutAgir ? (
            <ActionsRecommandation id={r.id} typeAction={r.action.type} />
          ) : (
            <p className="m-0 text-sm font-semibold">
              {LIBELLES_STATUT_RECOMMANDATION[r.statut] ?? r.statut}
            </p>
          )}
        </article>
      ))}
      {analyse.questionsOuvertes.length ? (
        <section aria-labelledby="questions-ia" className={carte}>
          <h2 id="questions-ia" className="m-0 text-base">
            Questions ouvertes
          </h2>
          <ul className="m-0 pl-5 text-sm">
            {analyse.questionsOuvertes.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
