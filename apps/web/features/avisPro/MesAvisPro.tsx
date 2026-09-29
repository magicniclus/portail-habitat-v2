'use client';

import {
  FILTRES_AVIS_PRO,
  filtrerAvisPro,
  LIBELLES_FILTRE_AVIS,
  resumeAvisPro,
  type FiltreAvisPro,
} from '@ph/core/espace-pro';
import { formatNombre } from '@ph/core/format';
import type { AvisPro } from '@ph/firebase/pro';
import { cn, EmptyState } from '@ph/ui';
import { useState } from 'react';
import { CarteAvisPro } from './CarteAvisPro';

/** Maquette Mes Avis : résumé, répartition des notes, filtres, réponses. */
export function MesAvisPro({
  avis,
  maintenant,
  peutRepondre,
}: {
  avis: AvisPro[];
  maintenant: number;
  peutRepondre: boolean;
}) {
  const [filtre, setFiltre] = useState<FiltreAvisPro>('tous');
  const r = resumeAvisPro(avis, maintenant);
  const liste = filtrerAvisPro(avis, filtre);
  const maxi = Math.max(1, ...r.repartition.map((x) => x.nombre));
  const tuiles = [
    {
      cle: 'note',
      libelle: 'Note moyenne',
      valeur: r.total ? `${formatNombre(r.moyenne, 1)}/5` : '–',
    },
    { cle: 'total', libelle: 'Avis publiés', valeur: formatNombre(r.total) },
    {
      cle: 'positifs',
      libelle: 'Avis positifs',
      valeur: `${formatNombre(r.partPositifs * 100)} %`,
    },
    { cle: 'recents', libelle: 'Ces 30 derniers jours', valeur: formatNombre(r.recents) },
  ];
  return (
    <div className="grid gap-5">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
        {tuiles.map((t) => (
          <li key={t.cle} className="grid gap-1.5 rounded-[14px] border border-trait p-4">
            <span className="text-sm font-semibold text-neutre-800">{t.libelle}</span>
            <span className="text-[30px] leading-none font-bold">{t.valeur}</span>
          </li>
        ))}
      </ul>
      <section
        aria-labelledby="titre-repartition"
        className="grid gap-2 rounded-2xl border border-trait p-5"
      >
        <h2 id="titre-repartition" className="m-0 mb-1 text-lg">
          Répartition des notes
        </h2>
        {r.repartition.map((x) => (
          <p
            key={x.note}
            className="m-0 grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm"
          >
            <span>
              {x.note} étoile{x.note > 1 ? 's' : ''}
            </span>
            <span
              aria-hidden="true"
              className="block h-2 overflow-hidden rounded-pill bg-neutre-200"
            >
              <span
                className="block h-full rounded-pill bg-accent"
                style={{ width: `${(x.nombre / maxi) * 100}%` }}
              />
            </span>
            <span className="text-right font-semibold">{x.nombre}</span>
          </p>
        ))}
      </section>
      <div role="group" aria-label="Filtrer les avis" className="flex flex-wrap gap-2">
        {FILTRES_AVIS_PRO.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={f === filtre}
            onClick={() => setFiltre(f)}
            className={cn(
              'min-h-11 cursor-pointer rounded-pill border px-4 text-sm font-semibold',
              f === filtre
                ? 'border-accent bg-accent-action text-blanc'
                : 'border-trait bg-blanc text-neutre-800',
            )}
          >
            {LIBELLES_FILTRE_AVIS[f]}
          </button>
        ))}
      </div>
      {liste.length ? (
        <ul aria-label="Avis" className="m-0 grid list-none gap-3 p-0">
          {liste.map((a) => (
            <CarteAvisPro key={a.id} a={a} peutRepondre={peutRepondre} />
          ))}
        </ul>
      ) : (
        <EmptyState titre={avis.length ? 'Aucun avis dans ce filtre' : 'Pas encore d’avis publié'}>
          Invitez vos clients satisfaits à laisser un avis : les avis vérifiés rassurent les
          particuliers.
        </EmptyState>
      )}
    </div>
  );
}
