import {
  formatDureeVisite,
  formatPart,
  LIBELLES_ALERTE_COMPORTEMENT,
  texteAlerte,
} from '@ph/core/comportement';
import { formatNombre } from '@ph/core/format';
import type { AlerteLue, VueComportement } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { ActionsAlerte } from './ActionsAlerte';

const carte = 'rounded-card border border-trait bg-blanc p-3.5';

/** Indicateurs de la période et alertes ouvertes de la page (COMPORTEMENT §6). */
export function PanneauIndicateurs({
  vue,
  alertes,
  nomPage,
  contexte,
  peutConfigurer,
  peutIa,
}: {
  vue: VueComportement;
  alertes: AlerteLue[];
  nomPage: string;
  contexte: string;
  peutConfigurer: boolean;
  peutIa: boolean;
}) {
  const kpis = [
    ['Sessions', formatNombre(vue.sessions)],
    ['Conversion', formatPart(vue.conversions / Math.max(1, vue.sessions))],
    ['Temps médian', formatDureeVisite(vue.dureeMediane)],
    ['Profondeur médiane', `${formatNombre(vue.profondeurMediane)} %`],
  ] as const;
  return (
    <>
      <section aria-label="Indicateurs" className={`${carte} grid grid-cols-2 gap-2.5`}>
        {kpis.map(([l, v]) => (
          <p key={l} className="m-0 flex flex-col gap-0.5">
            <span className="text-xs text-neutre-700">{l}</span>
            <span className="text-xl leading-tight font-bold">{v}</span>
          </p>
        ))}
      </section>
      <section aria-labelledby="alertes-comportement" className={`${carte} flex flex-col`}>
        <h2 id="alertes-comportement" className="m-0 mb-1.5 text-base">
          Alertes détectées
        </h2>
        {alertes.length === 0 ? (
          <p className="m-0 text-sm text-neutre-700">Aucune friction ouverte sur cette page.</p>
        ) : (
          alertes.map((a) => {
            const libelle = LIBELLES_ALERTE_COMPORTEMENT[a.type] ?? a.type;
            const question = `Page « ${nomPage} » (${contexte}) — ${libelle}${a.element ? ` sur « ${a.element} »` : ''} : ${texteAlerte(a)} Que recommandes-tu ?`;
            return (
              <article
                key={a.id}
                className="flex flex-col gap-1 border-t border-trait py-2.5 first-of-type:border-t-0"
              >
                <p className="m-0 flex flex-wrap items-center gap-2">
                  <Badge tone={a.gravite >= 4 ? 'danger' : 'attention'}>{libelle}</Badge>
                  {a.element ? (
                    <span className="text-sm font-semibold">« {a.element} »</span>
                  ) : null}
                </p>
                <p className="m-0 text-sm text-neutre-800">{texteAlerte(a)}</p>
                <div className="flex flex-wrap items-center gap-x-3">
                  {peutIa ? (
                    <Link
                      href={`/admin/ia?question=${encodeURIComponent(question)}` as Route}
                      className="flex min-h-11 items-center text-sm font-semibold"
                    >
                      Demander à l’IA
                    </Link>
                  ) : null}
                  {peutConfigurer ? <ActionsAlerte alerteId={a.id} /> : null}
                </div>
              </article>
            );
          })
        )}
        <p className="m-0 mt-1 text-xs text-neutre-700">
          Corrélations, pas des causes. Médianes des cumuls : moyenne des médianes du jour.
        </p>
      </section>
    </>
  );
}
