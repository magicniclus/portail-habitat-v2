'use client';

import {
  conseilsToit,
  formatLongueur,
  formatSurface,
  niveauSuperieur,
  quantitesToiture,
  type ModificationToiture,
  type TypeToiture,
} from '@ph/core/dessin';
import { Button, Field, Select } from '@ph/ui';
import type { Dispatch } from 'react';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { HauteursToit } from './HauteursToit';
import { PartiesToit } from './PartiesToit';
import { SensToit } from './SensToit';
import { Info } from './blocs';
import { CouverturesToit, FormesToit, type Couverture } from './FormesToit';

/** Toiture & combles (DES-16, DES-17) : forme conseillée, pente, débords, faîtage, quantités. */
export function ToitureMenu({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const n = niveauDe(etat);
  const t = n.toiture;
  const dessus = niveauSuperieur(sceneDe(etat), n.id);
  const conseils = conseilsToit(n, dessus);
  // Choisir une forme recalcule toutes les toitures de la maison (chaque niveau, ce qui dépasse
  // de l'étage, les appentis) : jamais un toit ancien qui ne raccorde plus après un changement.
  const poser = (type: TypeToiture) => dispatch({ type: 'toitureAuto', toiture: type });
  if (!t)
    return (
      <div className="grid gap-3">
        <p className="m-0 px-1 text-sm leading-5 text-neutre-800">
          Choisissez une forme : les toits de toute la maison, à chaque niveau, se recalculent
          ensemble. Les formes conseillées pour votre maison sont en tête.
        </p>
        <FormesToit actif={null} choisir={poser} conseils={conseils} />
      </div>
    );
  const q = quantitesToiture(n, dessus);
  const pente = t.pentes[0]! / 10;
  const modifier = (modif: ModificationToiture) => dispatch({ type: 'modifierToiture', modif });
  return (
    <div className="grid gap-4">
      <FormesToit actif={t.type} choisir={poser} conseils={conseils} />
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
      <SensToit toiture={t} orienter={(o) => dispatch({ type: 'orienterToit', ...o })} />
      <PartiesToit niveau={n} dessus={dessus} dispatch={dispatch} />
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
        </div>
      </details>
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
