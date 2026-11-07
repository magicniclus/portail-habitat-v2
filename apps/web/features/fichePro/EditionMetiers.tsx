'use client';

import { Checkbox } from '@ph/ui';
import { PlusIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { FeuilleEdition } from './FeuilleEdition';

/**
 * « + » des métiers (maquette Ma fiche) : autres métiers exercés, ajoutés ici après l'inscription
 * (décision du 25/10) ; le métier principal reste coché et en tête.
 */
export function EditionMetiers({
  metiers,
  principal,
  groupes,
}: {
  metiers: string[];
  principal: string;
  groupes: { nom: string; metiers: { id: string; nom: string }[] }[];
}) {
  const [choisis, setChoisis] = useState(new Set(metiers));
  const basculer = (id: string, oui: boolean) =>
    setChoisis((c) => {
      const n = new Set(c);
      if (oui) n.add(id);
      else n.delete(id);
      return n;
    });
  return (
    <FeuilleEdition
      titre="Vos métiers"
      entree={() => ({ metiers: [principal, ...[...choisis].filter((m) => m !== principal)] })}
      declencheur={
        <button
          type="button"
          aria-label="Ajouter un métier"
          className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-dashed border-neutre-500 bg-blanc text-neutre-800 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PlusIcon size={18} aria-hidden="true" />
        </button>
      }
    >
      <p className="m-0 text-sm text-neutre-800">
        Cochez les métiers que vous exercez : vous recevrez aussi les demandes correspondantes. 10
        au plus.
      </p>
      {groupes.map((g) => (
        <fieldset key={g.nom} className="m-0 grid gap-0 border-0 p-0">
          <legend className="mb-1 text-[15px] font-semibold">{g.nom}</legend>
          {g.metiers.map((m) => (
            <Checkbox
              key={m.id}
              checked={choisis.has(m.id)}
              disabled={m.id === principal || (!choisis.has(m.id) && choisis.size >= 10)}
              onChange={(e) => basculer(m.id, e.currentTarget.checked)}
            >
              {m.nom}
              {m.id === principal ? ' (métier principal)' : ''}
            </Checkbox>
          ))}
        </fieldset>
      ))}
    </FeuilleEdition>
  );
}
