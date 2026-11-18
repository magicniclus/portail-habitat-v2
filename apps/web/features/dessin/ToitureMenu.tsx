'use client';

import {
  formatLongueur,
  formatSurface,
  LIBELLES_TOITURE,
  quantitesToiture,
  type ElementToit,
  type ModificationToiture,
  type TypeToiture,
} from '@ph/core/dessin';
import { Button, Field, Select } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';

const COUVERTURES = [
  ['tuile', 'Tuiles'],
  ['ardoise', 'Ardoise'],
  ['zinc', 'Zinc'],
  ['bac_acier', 'Bac acier'],
  ['vegetalise', 'Toiture végétalisée'],
] as const;
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
  if (!t)
    return (
      <div className="grid gap-3">
        <p className="m-0 px-1 text-sm leading-5 text-neutre-800">
          Le toit se génère sur les murs du niveau affiché ({n.nom}). Choisissez sa forme :
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LIBELLES_TOITURE) as TypeToiture[]).map((type) => (
            <button
              key={type}
              type="button"
              className={`${bouton} border-neutre-300 bg-blanc text-texte hover:bg-neutre-100`}
              onClick={() => dispatch({ type: 'toiture', toiture: type })}
            >
              {LIBELLES_TOITURE[type]}
            </button>
          ))}
        </div>
      </div>
    );
  const q = quantitesToiture(n);
  const pente = t.pentes[0]! / 10;
  const modifier = (modif: ModificationToiture) => dispatch({ type: 'modifierToiture', modif });
  const elements = [
    ...t.fenetresToit.map((x) => ({ id: x.id, libelle: 'Fenêtre de toit' })),
    ...t.cheminees.map((x) => ({ id: x.id, libelle: 'Cheminée' })),
    ...t.lucarnes.map((x) => ({ id: x.id, libelle: `Lucarne ${x.type.replace('_', '-')}` })),
  ];
  return (
    <div className="grid gap-4">
      <Field label="Forme">
        <Select
          value={t.type}
          onChange={(ev) => modifier({ type: ev.target.value as TypeToiture })}
        >
          {(Object.keys(LIBELLES_TOITURE) as TypeToiture[]).map((k) => (
            <option key={k} value={k}>
              {LIBELLES_TOITURE[k]}
            </option>
          ))}
        </Select>
      </Field>
      <label className="grid gap-1 px-1 text-[13px] font-semibold">
        Pente · {pente}°
        <input
          type="range"
          min={t.type === 'plate' ? 0 : 5}
          max={60}
          value={pente}
          onChange={(ev) => modifier({ pentes: [Number(ev.target.value) * 10] })}
          className="h-11 cursor-pointer accent-accent"
        />
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Débord">
          <Select value={t.debord} onChange={(ev) => modifier({ debord: Number(ev.target.value) })}>
            {[0, 200, 400, 600, 800].map((d) => (
              <option key={d} value={d}>
                {d / 10} cm
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Couverture">
          <Select
            value={t.couverture.famille}
            onChange={(ev) =>
              modifier({
                couverture: { famille: ev.target.value as (typeof COUVERTURES)[number][0] },
              })
            }
          >
            {COUVERTURES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button
        variant="secondaire"
        onClick={() => modifier({ faitageAngle: t.faitageAngle === 0 ? 900 : 0 })}
      >
        Tourner le faîtage
      </Button>
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
          <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
            <dt className="text-neutre-700">Couverture</dt>
            <dd className="m-0 font-bold">{formatSurface(q.couverture)}</dd>
          </div>
          <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
            <dt className="text-neutre-700">Gouttières</dt>
            <dd className="m-0 font-bold">{formatLongueur(q.gouttieres)}</dd>
          </div>
          {q.carrez !== null ? (
            <div className="col-span-2 rounded-lg bg-neutre-100 px-2.5 py-2">
              <dt className="text-neutre-700">Combles à 1,80 m et plus (Carrez)</dt>
              <dd className="m-0 font-bold">{formatSurface(q.carrez)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <Button variant="secondaire" onClick={() => dispatch({ type: 'toiture', toiture: null })}>
        Supprimer la toiture
      </Button>
    </div>
  );
}
