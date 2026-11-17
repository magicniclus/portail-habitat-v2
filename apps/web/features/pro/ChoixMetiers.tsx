'use client';

import { intentionsApresChangement } from '@ph/core/onboarding';
import { Checkbox, Field, Select } from '@ph/ui';
import { useState, type ReactNode } from 'react';
import type { ChantierMetier, GroupeMetiers } from './metiers';

/**
 * Métier et chantiers (COMPTES §3.1 bis) : métier principal seul (obligatoire), ses chantiers tous
 * acceptés et repliés derrière « Modifier mes chantiers » (ONB-01b, ONB-01c, décision du 17/11/2026 :
 * le formulaire ne s'allonge plus au choix du métier). Les autres métiers se règlent dans Ma fiche.
 */
export function ChoixMetiers({
  groupes,
  chantiers,
  principalInitial,
  erreurPrincipal,
  onPrincipal,
  aCote,
  milieu,
}: {
  groupes: GroupeMetiers[];
  chantiers: ChantierMetier[];
  principalInitial?: string;
  erreurPrincipal?: string;
  onPrincipal: (id: string) => void;
  /** À côté du métier, sur la même ligne (le code postal). */
  aCote?: ReactNode;
  /** Entre la ligne du métier et celle des chantiers (l'email). */
  milieu?: ReactNode;
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
  const [ouvert, setOuvert] = useState(false);

  const nbCoches = intentions.filter((i) =>
    chantiers.some((c) => c.id === i && metiers.includes(c.metier)),
  ).length;
  const nbChantiers = chantiers.filter((c) => metiers.includes(c.metier)).length;

  return (
    <>
      {/* Métier et code postal sur une ligne : le formulaire tient dans le premier écran. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(96px,34%)] items-start gap-3">
        <Field label="Métier principal" requis erreur={erreurPrincipal}>
          <Select
            name="metierPrincipal"
            value={principal}
            autoComplete="off"
            onChange={(e) => {
              const id = e.target.value;
              changer(id ? [id] : []);
              onPrincipal(id);
            }}
          >
            <option value="">Choisir</option>
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
        {aCote}
      </div>
      {milieu}
      {/* Chantiers : tous acceptés, repliés ; la ligne garde la même hauteur avant et après le choix
          du métier (le formulaire ne s'allonge pas). Les autres métiers se règlent dans Ma fiche. */}
      <div className="flex min-h-11 items-center justify-between gap-2 text-[13.5px] whitespace-nowrap">
        <span className="min-w-0 truncate text-neutre-800">
          {principal
            ? nbCoches === nbChantiers
              ? 'Tous les chantiers'
              : `${nbCoches} chantier${nbCoches > 1 ? 's' : ''} sur ${nbChantiers}`
            : 'Chantiers : tous'}
        </span>
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls="chantiers-acceptes"
          disabled={!principal}
          onClick={() => setOuvert(!ouvert)}
          className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent-700 underline underline-offset-2 disabled:cursor-default disabled:text-neutre-700 disabled:no-underline"
        >
          {ouvert ? 'Fermer' : 'Modifier mes chantiers'}
        </button>
      </div>
      {principal && ouvert ? (
        <fieldset id="chantiers-acceptes" className="m-0 grid min-w-0 gap-1 border-0 p-0">
          <legend className="mb-1 p-0 text-[15px] font-semibold">Chantiers acceptés</legend>
          <p className="m-0 mb-1 text-[13px] text-neutre-700">
            Décochez ce que vous ne faites pas : vous ne recevrez pas ces demandes. Vos autres
            métiers s’ajoutent ensuite dans Ma fiche.
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
