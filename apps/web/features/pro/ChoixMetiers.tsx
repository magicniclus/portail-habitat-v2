'use client';

import { intentionsApresChangement } from '@ph/core/onboarding';
import { Checkbox, Field, Select } from '@ph/ui';
import { useState } from 'react';
import type { ChantierMetier, GroupeMetiers } from './metiers';

const MAX_AUTRES = 4;

/**
 * Métiers et chantiers (COMPTES §3.1 bis) : métier principal (obligatoire), jusqu'à 4 autres métiers
 * en pastilles, chantiers de chaque métier cochés par défaut (ONB-01b, ONB-01c).
 */
export function ChoixMetiers({
  groupes,
  chantiers,
  principalInitial,
  erreurPrincipal,
  onPrincipal,
}: {
  groupes: GroupeMetiers[];
  chantiers: ChantierMetier[];
  principalInitial?: string;
  erreurPrincipal?: string;
  onPrincipal: (id: string) => void;
}) {
  const noms = new Map(groupes.flatMap((g) => g.metiers).map((m) => [m.id, m.nom]));
  const [metiers, setMetiers] = useState<string[]>(principalInitial ? [principalInitial] : []);
  const [intentions, setIntentions] = useState<string[]>(() =>
    intentionsApresChangement({ metiers: [], intentions: [] }, metiers, chantiers),
  );
  const changer = (suivants: string[]) => {
    setIntentions(intentionsApresChangement({ metiers, intentions }, suivants, chantiers));
    setMetiers(suivants);
  };
  const principal = metiers[0] ?? '';

  return (
    <>
      <Field label="Métier principal" requis erreur={erreurPrincipal}>
        <Select
          name="metierPrincipal"
          value={principal}
          onChange={(e) => {
            const id = e.target.value;
            changer(id ? [id, ...metiers.slice(1).filter((m) => m !== id)] : metiers.slice(1));
            onPrincipal(id);
          }}
        >
          <option value="">Choisissez votre métier</option>
          {groupes.map((g) => (
            <optgroup key={g.nom} label={g.nom}>
              {g.metiers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      {principal ? (
        <>
          <Field label="Autres métiers (facultatif, jusqu’à 4)">
            <Select
              value=""
              disabled={metiers.length > MAX_AUTRES}
              onChange={(e) => e.target.value && changer([...metiers, e.target.value])}
            >
              <option value="">Ajouter un métier…</option>
              {groupes.map((g) => (
                <optgroup key={g.nom} label={g.nom}>
                  {g.metiers
                    .filter((m) => !metiers.includes(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          {metiers.length > 1 ? (
            <ul aria-label="Autres métiers" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {metiers.slice(1).map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => changer(metiers.filter((x) => x !== m))}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-accent-300 bg-accent-100 px-3.5 text-sm font-semibold text-accent-800"
                  >
                    {noms.get(m)} <span aria-hidden="true">×</span>
                    <span className="sr-only"> : retirer</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-[15px] font-semibold">Chantiers acceptés</legend>
            <p className="m-0 text-[13px] text-neutre-700">
              Décochez ce que vous ne faites pas : vous ne recevrez pas ces demandes.
            </p>
            {metiers.map((m) => (
              <div key={m} className="grid gap-1">
                <p className="m-0 text-[13px] font-bold text-neutre-800">{noms.get(m)}</p>
                {chantiers
                  .filter((c) => c.metier === m)
                  .map((c) => (
                    <Checkbox
                      key={c.id}
                      checked={intentions.includes(c.id)}
                      onChange={(e) =>
                        setIntentions(
                          e.currentTarget.checked
                            ? [...intentions, c.id]
                            : intentions.filter((x) => x !== c.id),
                        )
                      }
                      className="text-sm"
                    >
                      {c.libelle}
                    </Checkbox>
                  ))}
              </div>
            ))}
          </fieldset>
        </>
      ) : null}
      {metiers.map((m) => (
        <input key={m} type="hidden" name="metiers" value={m} />
      ))}
      {intentions.map((i) => (
        <input key={i} type="hidden" name="intentions" value={i} />
      ))}
    </>
  );
}
