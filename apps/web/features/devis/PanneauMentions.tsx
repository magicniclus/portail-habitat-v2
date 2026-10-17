import type { ResultatMentions, Totaux } from '@ph/core/devis';
import { formatEuros } from '@ph/core/format';
import { cn } from '@ph/ui';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Colonne de droite de l'éditeur : totaux et mentions obligatoires (✓ / !), calculés par les mêmes
 * fonctions que le serveur. Jamais d'aperçu du PDF (DEV-05).
 */
export function PanneauMentions({
  totaux,
  mentions,
}: {
  totaux: Totaux;
  mentions: ResultatMentions;
}) {
  const ok = mentions.liste.filter((m) => m.ok).length;
  return (
    <aside className="grid content-start gap-4 rounded-[14px] border border-trait bg-blanc p-4">
      <dl className="m-0 grid gap-1 text-[15px]">
        {totaux.remiseCentimes > 0 ? (
          <div className="flex justify-between">
            <dt>Remise</dt>
            <dd className="m-0">− {eur(totaux.remiseCentimes)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>Total HT</dt>
          <dd className="m-0">{eur(totaux.htCentimes)}</dd>
        </div>
        {Object.entries(totaux.tva).map(([t, m]) => (
          <div key={t} className="flex justify-between">
            <dt>TVA {t.replace('.', ',')} %</dt>
            <dd className="m-0">{eur(m)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-trait pt-1.5 text-lg font-bold">
          <dt>Total TTC</dt>
          <dd className="m-0" data-testid="total-ttc-devis">
            {eur(totaux.ttcCentimes)}
          </dd>
        </div>
        <div className="flex justify-between text-sm text-neutre-700">
          <dt>Marge HT (visible par vous seul)</dt>
          <dd className="m-0">{eur(totaux.margeHtCentimes)}</dd>
        </div>
      </dl>
      <section aria-labelledby="mentions-titre" className="grid gap-2">
        <h2 id="mentions-titre" className="m-0 flex items-center justify-between text-base">
          Mentions obligatoires
          <span className={cn('text-sm', mentions.ok ? 'text-succes' : 'text-danger')}>
            {ok} / {mentions.liste.length}
          </span>
        </h2>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-sm" aria-label="Mentions obligatoires">
          {mentions.liste.map((m) => (
            <li key={m.cle} className="flex items-start gap-2" data-mention={m.cle} data-ok={m.ok}>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 flex-none items-center justify-center rounded-full text-xs font-bold',
                  m.ok ? 'bg-succes-fond text-succes' : 'bg-danger-fond text-danger',
                )}
              >
                {m.ok ? '✓' : '!'}
              </span>
              <span>
                {m.libelle}
                <span className="sr-only">{m.ok ? ' : présente' : ' : manquante'}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
