'use client';

import { LIBELLES_FAMILLE, type Revetement } from '@ph/core/dessin';
import { Button } from '@ph/ui';
import { MATERIAUX_DESSIN } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import type { Action } from './etat';

/** Nom lisible d'un revêtement : matériau du catalogue, sinon sa famille. */
const nom = (r: Revetement) =>
  MATERIAUX_DESSIN.find((m) => m.id === r.materiauId)?.libelle ??
  MATERIAUX_DESSIN.find((m) => m.famille === r.famille && m.couleur === r.couleur)?.libelle ??
  (r.famille === 'aucun' ? 'Brut' : (LIBELLES_FAMILLE[r.famille] ?? 'Revêtement'));

/**
 * Revêtements de la sélection, en résumé : les matériaux se choisissent dans Finitions (un seul
 * endroit), Propriétés ne fait que les rappeler et y mène.
 */
export function ResumeFinitions({
  surfaces,
  finitionsOuvert,
  dispatch,
}: {
  surfaces: { libelle: string; revetement: Revetement }[];
  finitionsOuvert: boolean;
  dispatch: Dispatch<Action>;
}) {
  return (
    <section aria-label="Revêtements" className="grid gap-2">
      <dl className="m-0 grid gap-1.5">
        {surfaces.map((s) => (
          <div key={s.libelle} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="size-6 shrink-0 rounded-md ring-1 ring-neutre-300"
              style={{ backgroundColor: s.revetement.couleur ?? 'transparent' }}
            />
            <dt className="text-neutre-700">{s.libelle}</dt>
            <dd className="m-0 ml-auto font-semibold">{nom(s.revetement)}</dd>
          </div>
        ))}
      </dl>
      {finitionsOuvert ? (
        <p className="m-0 text-[13px] text-neutre-700">
          Matériaux et couleurs : Finitions, à gauche.
        </p>
      ) : (
        <Button
          variant="secondaire"
          onClick={() => dispatch({ type: 'menu', menu: 'finitions', basculer: false })}
        >
          Choisir les matériaux
        </Button>
      )}
    </section>
  );
}
