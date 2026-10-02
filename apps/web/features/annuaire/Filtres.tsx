'use client';

import { classesChip } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type ReactNode } from 'react';
import { requeteFiltres } from './requete';

export interface OptionsFiltres {
  metiers: { id: string; nom: string }[];
  notes: readonly { v: number; libelle: string }[];
  labels: { id: string; libelle: string }[];
  dispos: readonly { v: string; libelle: string }[];
  budgets: readonly { v: string; libelle: string }[];
}

export interface ValeursFiltres {
  q: string;
  ville: string;
  tri: string;
  metier: string[];
  rayon: number;
  note: number;
  labels: string[];
  dispo: string;
  budget: string;
}

const choix = `${classesChip} min-h-11 cursor-pointer text-[13.5px] has-checked:border-accent has-checked:bg-accent-100 has-checked:text-accent-800 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent`;

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-bold">{titre}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/**
 * Filtres de l'annuaire (README) : de vrais champs de formulaire, soumis à chaque changement ;
 * l'URL porte tout (ANN-01). Sans JavaScript, le bouton « Appliquer » soumet le formulaire.
 */
export function Filtres({
  valeurs,
  options,
  id,
  onApplique,
}: {
  valeurs: ValeursFiltres;
  options: OptionsFiltres;
  /** Préfixe des identifiants (le formulaire existe en colonne et dans la feuille mobile). */
  id: string;
  onApplique?: () => void;
}) {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [rayon, setRayon] = useState(valeurs.rayon);
  const [, demarrer] = useTransition();
  const minuterie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Regroupe les changements rapprochés (curseur du rayon) : une seule navigation.
  const appliquer = () => {
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      const f = formulaire.current;
      if (!f) return;
      const cible = `/artisans${requeteFiltres(new FormData(f))}`;
      demarrer(() =>
        router.replace(cible as Parameters<typeof router.replace>[0], { scroll: false }),
      );
      onApplique?.();
    }, 250);
  };

  return (
    <form
      ref={formulaire}
      action="/artisans"
      onChange={appliquer}
      onSubmit={(e) => {
        e.preventDefault();
        appliquer();
      }}
      aria-label="Filtres"
      className="grid gap-5"
    >
      <input type="hidden" name="q" value={valeurs.q} />
      <input type="hidden" name="ville" value={valeurs.ville} />
      <input type="hidden" name="tri" value={valeurs.tri} />
      <Groupe titre="Métier">
        {options.metiers.map((m) => (
          <label key={m.id} className={choix}>
            <input
              type="checkbox"
              name="metier"
              value={m.id}
              defaultChecked={valeurs.metier.includes(m.id)}
              className="sr-only"
            />
            {m.nom}
          </label>
        ))}
      </Groupe>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor={`${id}-rayon`} className="text-sm font-bold">
            Rayon d&apos;intervention
          </label>
          <output htmlFor={`${id}-rayon`} className="text-sm font-bold text-accent-700">
            {rayon} km
          </output>
        </div>
        <input
          id={`${id}-rayon`}
          type="range"
          name="rayon"
          min={5}
          max={60}
          step={5}
          defaultValue={valeurs.rayon}
          onInput={(e) => setRayon(Number(e.currentTarget.value))}
          className="h-11 w-full accent-accent"
        />
      </div>
      <Groupe titre="Note minimum">
        {options.notes.map((n) => (
          <label key={n.v} className={choix}>
            <input
              type="radio"
              name="note"
              value={n.v}
              defaultChecked={valeurs.note === n.v}
              className="sr-only"
            />
            {n.v ? (
              <span aria-hidden="true" className="text-etoile">
                ★
              </span>
            ) : null}
            {n.libelle}
          </label>
        ))}
      </Groupe>
      <Groupe titre="Garanties et labels">
        {options.labels.map((l) => (
          <label key={l.id} className={choix}>
            <input
              type="checkbox"
              name="labels"
              value={l.id}
              defaultChecked={valeurs.labels.includes(l.id)}
              className="sr-only"
            />
            {l.libelle}
          </label>
        ))}
      </Groupe>
      <Groupe titre="Disponibilité">
        {options.dispos.map((d) => (
          <label key={d.v} className={choix}>
            <input
              type="radio"
              name="dispo"
              value={d.v}
              defaultChecked={valeurs.dispo === d.v}
              className="sr-only"
            />
            {d.libelle}
          </label>
        ))}
      </Groupe>
      <Groupe titre="Budget de chantier">
        {options.budgets.map((b) => (
          <label key={b.v} className={choix}>
            <input
              type="radio"
              name="budget"
              value={b.v}
              defaultChecked={valeurs.budget === b.v}
              className="sr-only"
            />
            {b.libelle}
          </label>
        ))}
      </Groupe>
      <noscript>
        <button type="submit" className={classesChip}>
          Appliquer
        </button>
      </noscript>
    </form>
  );
}
