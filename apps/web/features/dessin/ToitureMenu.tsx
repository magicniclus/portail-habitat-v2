'use client';

import {
  formatLongueur,
  formatSurface,
  niveauSuperieur,
  quantitesToiture,
  type ElementToit,
  type ModificationToiture,
  type TypeToiture,
} from '@ph/core/dessin';
import { Button, Field, Select } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { HauteursToit } from './HauteursToit';
import { Info } from './blocs';
import { CouverturesToit, FormesToit, type Couverture } from './FormesToit';

const ELEMENTS: [ElementToit, string][] = [
  ['fenetre', 'Fenêtre de toit'],
  ['cheminee', 'Cheminée'],
  ['jacobine', 'Lucarne jacobine'],
  ['capucine', 'Lucarne capucine'],
  ['chien_assis', 'Chien-assis'],
];
const bouton =
  'min-h-11 cursor-pointer rounded-[10px] border px-2.5 text-left text-sm font-semibold font-[inherit]';

/** Toiture & combles (DES-16, DES-17) : génération, pente, débords, faîtage, éléments, quantités. */
export function ToitureMenu({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const n = niveauDe(etat);
  const t = n.toiture;
  const dessus = niveauSuperieur(sceneDe(etat), n.id);
  const poser = (type: TypeToiture) =>
    t
      ? dispatch({ type: 'modifierToiture', modif: { type } })
      : dispatch({ type: 'toitureAuto', toiture: type });
  if (!t)
    return (
      <div className="grid gap-3">
        <p className="m-0 px-1 text-sm leading-5 text-neutre-800">
          Choisissez une forme : le toit se pose seul sur toute la maison, quelle que soit sa forme.
        </p>
        <FormesToit actif={null} choisir={poser} />
      </div>
    );
  const q = quantitesToiture(n, dessus);
  const pente = t.pentes[0]! / 10;
  const modifier = (modif: ModificationToiture) => dispatch({ type: 'modifierToiture', modif });
  const elements = [
    ...t.fenetresToit.map((x) => ({ id: x.id, libelle: 'Fenêtre de toit' })),
    ...t.cheminees.map((x) => ({ id: x.id, libelle: 'Cheminée' })),
    ...t.lucarnes.map((x) => ({ id: x.id, libelle: `Lucarne ${x.type.replace('_', '-')}` })),
  ];
  return (
    <div className="grid gap-4">
      <FormesToit actif={t.type} choisir={poser} />
      <Button
        variant="secondaire"
        onClick={() => {
          dispatch({ type: 'vueExterieure' });
          dispatch({ type: 'vue', vue: '3d' });
        }}
      >
        Voir la maison fermée en 3D
      </Button>
      {q ? (
        <HauteursToit
          egout={q.egout}
          faitage={q.faitage}
          plat={t.type === 'plate'}
          dispatch={dispatch}
        />
      ) : null}
      <label className="grid gap-1 px-1 text-[13px] font-semibold">
        Pente · {Math.round(pente)}°
        <input
          type="range"
          min={t.type === 'plate' ? 0 : 5}
          max={60}
          value={pente}
          onChange={(ev) => modifier({ pentes: [Number(ev.target.value) * 10] })}
          className="h-11 cursor-pointer accent-accent"
        />
      </label>
      <CouverturesToit
        actif={t.couverture.famille as Couverture}
        choisir={(famille) => modifier({ couverture: { famille } })}
      />
      <details className="rounded-[10px] border border-neutre-200 px-3 py-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">
          Plus de réglages
        </summary>
        <div className="grid gap-3 pt-2 pb-1">
          <Field label="Débord">
            <Select
              value={t.debord}
              onChange={(ev) => modifier({ debord: Number(ev.target.value) })}
            >
              {[0, 200, 400, 600, 800].map((d) => (
                <option key={d} value={d}>
                  {d / 10} cm
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="secondaire"
            onClick={() => modifier({ faitageAngle: t.faitageAngle === 0 ? 900 : 0 })}
          >
            Tourner les faîtages
          </Button>
        </div>
      </details>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 px-1 text-[13px] font-semibold">
          Ajouter sur le toit (puis cliquez sur le plan)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENTS.map(([el, libelle]) => {
            const choisi = etat.outil === 'toit' && etat.elementToit === el;
            return (
              <button
                key={el}
                type="button"
                aria-pressed={choisi}
                className={`${bouton} ${choisi ? 'border-accent bg-accent-100' : 'border-neutre-300 bg-blanc'} text-texte`}
                onClick={() => dispatch({ type: 'outil', outil: 'toit', elementToit: el })}
              >
                {libelle}
              </button>
            );
          })}
        </div>
      </fieldset>
      {elements.length ? (
        <ul className="m-0 grid list-none gap-1 p-0">
          {elements.map((x) => (
            <li key={x.id} className="flex items-center justify-between px-1 text-sm">
              {x.libelle}
              <button
                type="button"
                aria-label={`Retirer : ${x.libelle}`}
                className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent hover:bg-neutre-100"
                onClick={() => dispatch({ type: 'retirerElementToit', id: x.id })}
              >
                <TrashIcon aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {q ? (
        <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
          <Info libelle="Couverture" valeur={formatSurface(q.couverture)} />
          <Info libelle="Gouttières" valeur={formatLongueur(q.gouttieres)} />
          {q.carrez !== null ? (
            <Info
              libelle="Combles à 1,80 m et plus (Carrez)"
              valeur={formatSurface(q.carrez)}
              large
            />
          ) : null}
        </dl>
      ) : null}
      <Button variant="secondaire" onClick={() => dispatch({ type: 'toiture', toiture: null })}>
        Retirer le toit de ce niveau
      </Button>
    </div>
  );
}
