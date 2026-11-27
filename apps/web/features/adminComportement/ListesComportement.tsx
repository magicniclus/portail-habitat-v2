'use client';

import { formatPart } from '@ph/core/comportement';
import { formatNombre } from '@ph/core/format';
import type { DonneesCartes } from './types';

const carte = 'flex flex-col gap-1 rounded-card border border-trait bg-blanc p-3.5';
const ligne =
  'flex w-full cursor-default flex-col items-start gap-0.5 rounded-md border-0 bg-transparent px-2 py-2 text-left hover:bg-neutre-100 focus-visible:bg-neutre-100';

/** Éléments et sections ; le survol d'une ligne la surligne sur la page. */
export function ListesComportement({
  donnees,
  onSurligne,
}: {
  donnees: DonneesCartes;
  onSurligne: (cle: string | null) => void;
}) {
  const n = Math.max(1, donnees.sessions);
  const elements = Object.entries(donnees.elements)
    .filter(([, e]) => e.clics || e.hesitations || e.morts)
    .sort(([, a], [, b]) => b.clics - a.clics)
    .slice(0, 10);
  const sorties = new Map(donnees.sorties.map((s) => [s.section, s.part]));
  const sections = Object.entries(donnees.sections).sort(([, a], [, b]) => b.vues - a.vues);
  const survol = (cle: string) => ({
    onMouseEnter: () => onSurligne(cle),
    onMouseLeave: () => onSurligne(null),
    onFocus: () => onSurligne(cle),
    onBlur: () => onSurligne(null),
  });
  return (
    <>
      <section className={carte} aria-labelledby="elements-comportement">
        <h2 id="elements-comportement" className="m-0 mb-1.5 text-base">
          Éléments cliquables
        </h2>
        {elements.length ? (
          elements.map(([cle, e]) => (
            <button key={cle} type="button" className={ligne} {...survol(cle)}>
              <span className="flex w-full justify-between gap-2 font-semibold">
                <span className="truncate">{cle}</span>
                <span>{formatNombre(e.clics)} clics</span>
              </span>
              <span className="text-xs text-neutre-700">
                {formatPart(e.clics / n)} des sessions
                {e.hesitations ? ` · hésitation ${formatPart(e.hesitations / n)}` : ''}
                {e.morts ? ` · clic mort ${formatPart(e.morts / n)}` : ''}
              </span>
            </button>
          ))
        ) : (
          <p className="m-0 text-sm text-neutre-700">Aucun clic mesuré sur cette période.</p>
        )}
      </section>
      <section className={carte} aria-labelledby="sections-comportement">
        <h2 id="sections-comportement" className="m-0 mb-1.5 text-base">
          Sections
        </h2>
        {sections.map(([id, s]) => (
          <button key={id} type="button" className={ligne} {...survol(id)}>
            <span className="flex w-full justify-between gap-2 font-semibold">
              <span>{id}</span>
              <span>{formatPart(sorties.get(id) ?? 0)} des sorties</span>
            </span>
            <span className="text-xs text-neutre-700">
              atteinte {formatPart(s.vues / n)} · lecture{' '}
              {formatNombre(Math.round(s.tempsTotalMs / Math.max(1, s.vues) / 1000))} s · conversion
              si lue {formatPart(s.conversionsSiLue / Math.max(1, s.lues))}
            </span>
          </button>
        ))}
      </section>
    </>
  );
}
