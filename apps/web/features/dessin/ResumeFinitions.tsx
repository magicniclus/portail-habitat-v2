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
  /** `choisir` : rend la surface cliquable (un côté de mur : la montrer et la revêtir). */
  surfaces: {
    libelle: string;
    revetement: Revetement;
    choisie?: boolean;
    choisir?: () => void;
  }[];
  finitionsOuvert: boolean;
  dispatch: Dispatch<Action>;
}) {
  return (
    <section aria-label="Revêtements" className="grid gap-2">
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {surfaces.map((s, i) => {
          const contenu = (
            <>
              {/* Pastille : la couleur posée, ou le gris du mur brut (non revêtu). */}
              <span
                aria-hidden="true"
                className={`size-6 shrink-0 rounded-full ring-1 ring-neutre-300 ${s.revetement.couleur ? '' : 'bg-neutre-300'}`}
                style={s.revetement.couleur ? { backgroundColor: s.revetement.couleur } : undefined}
              />
              <span className="text-neutre-700">{s.libelle}</span>
              <span className="ml-auto font-semibold">{nom(s.revetement)}</span>
            </>
          );
          return (
            <li key={i}>
              {s.choisir ? (
                <button
                  type="button"
                  aria-pressed={s.choisie ?? false}
                  onClick={s.choisir}
                  className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 text-left text-sm font-[inherit] transition-colors ${s.choisie ? 'border-accent bg-accent-100' : 'border-neutre-200 bg-blanc hover:bg-neutre-100'}`}
                >
                  {contenu}
                </button>
              ) : (
                <div className="flex items-center gap-2.5 text-sm">{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>
      {finitionsOuvert ? (
        <p className="m-0 text-[13px] text-neutre-700">
          {surfaces.some((x) => x.choisir)
            ? 'Cliquez sur un côté pour le voir sur le plan, puis choisissez son matériau dans Finitions.'
            : 'Matériaux et couleurs : Finitions, à gauche.'}
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
