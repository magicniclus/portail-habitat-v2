'use client';

import {
  FAMILLES_A_POSE,
  FAMILLES_MUR,
  FAMILLES_SOL,
  LIBELLES_FAMILLE,
  LIBELLES_POSE,
  type FamilleRevetement,
  type Pose,
  type Revetement,
} from '@ph/core/dessin';
import { MATERIAUX_DESSIN, type MateriauDessin } from '@ph/ui/tokens';
import { Button } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';
import { useCibleFinition, type Cible } from './cibleFinition';
import { ReglagesPeinture } from './ReglagesPeinture';

const choix =
  'min-h-11 cursor-pointer rounded-full border px-3 text-sm font-semibold font-[inherit]';
const select = 'min-h-11 w-full rounded-control border border-neutre-300 bg-blanc px-2 text-base';

/** Menu Finitions (DES-25 à DES-28) : matériau, pose et joint, sur la sélection. */
export function FinitionsMenu({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const { cibles, cible, setCible, appliquer, actuel } = useCibleFinition(etat, dispatch);
  const familles =
    cible?.surface === 'mur'
      ? FAMILLES_MUR
      : cible?.surface === 'plafond'
        ? (['peinture', 'enduit'] as const)
        : FAMILLES_SOL;
  const [famille, setFamille] = useState<FamilleRevetement>(familles[0]!);
  const [pose, setPose] = useState<Pose>('droite');
  const [joint, setJoint] = useState(3);
  const f = familles.includes(famille) ? famille : familles[0]!;
  const aPose = FAMILLES_A_POSE.includes(f);
  const poser = (m: MateriauDessin) => {
    const r: Revetement = { famille: f, materiauId: m.id, couleur: m.couleur };
    if (f === 'peinture' && actuel?.finition) r.finition = actuel.finition;
    if (aPose)
      Object.assign(r, {
        pose,
        joint: { largeur: joint, ...(m.joint ? { couleur: m.joint } : {}) },
        ...(m.format ? { format: m.format } : {}),
      });
    appliquer(r);
  };
  const outilZone = (
    <Button variant="secondaire" onClick={() => dispatch({ type: 'outil', outil: 'zone' })}>
      Tracer une zone au sol
    </Button>
  );
  if (!cible)
    return (
      <div className="grid gap-3 px-1 text-sm leading-5 text-neutre-800">
        <p className="m-0 font-bold text-texte">Choisissez une surface</p>
        <p className="m-0">
          Cliquez sur une pièce, un mur ou une zone du plan, puis choisissez un matériau.
        </p>
        {outilZone}
      </div>
    );
  return (
    <div className="grid gap-4">
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 px-1 text-[13px] font-semibold">Appliquer sur</legend>
        <div className="flex flex-wrap gap-2">
          {cibles.map((c: Cible) => (
            <button
              key={c.cle}
              type="button"
              aria-pressed={c.cle === cible.cle}
              onClick={() => setCible(c.cle)}
              className={`${choix} ${c.cle === cible.cle ? 'border-accent bg-accent-100 text-accent-800' : 'border-neutre-300 bg-blanc text-texte'}`}
            >
              {c.libelle}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-1 px-1 text-[13px] font-semibold">
        Famille
        <select
          className={select}
          value={f}
          onChange={(ev) => setFamille(ev.target.value as FamilleRevetement)}
        >
          {familles.map((x) => (
            <option key={x} value={x}>
              {LIBELLES_FAMILLE[x] ?? x}
            </option>
          ))}
        </select>
      </label>
      {aPose ? (
        <div className="grid grid-cols-2 gap-2 px-1">
          <label className="grid gap-1 text-[13px] font-semibold">
            Pose
            <select
              className={select}
              value={pose}
              onChange={(ev) => setPose(ev.target.value as Pose)}
            >
              {Object.entries(LIBELLES_POSE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            Joint
            <select
              className={select}
              value={joint}
              onChange={(ev) => setJoint(Number(ev.target.value))}
            >
              {[1, 2, 3, 5, 8].map((j) => (
                <option key={j} value={j}>
                  {j} mm
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {f === 'peinture' ? <ReglagesPeinture actuel={actuel} appliquer={appliquer} /> : null}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 px-1 text-[13px] font-semibold">Matériaux</legend>
        <div className="grid grid-cols-2 gap-2">
          {MATERIAUX_DESSIN.filter((m) => m.famille === f).map((m) => {
            const actif = actuel?.materiauId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={actif}
                onClick={() => poser(m)}
                className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-[10px] border bg-blanc p-1.5 text-left text-[13px] font-[inherit] ${actif ? 'border-accent ring-2 ring-accent' : 'border-neutre-300'}`}
              >
                <span
                  aria-hidden="true"
                  className="size-10 shrink-0 rounded-lg border border-neutre-300"
                  style={{ background: m.couleur }}
                />
                {m.libelle}
              </button>
            );
          })}
        </div>
        {MATERIAUX_DESSIN.some((m) => m.famille === f) ? null : (
          <p className="m-0 px-1 text-sm text-neutre-800">
            Aucun matériau dans cette famille pour l’instant.
          </p>
        )}
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondaire"
          disabled={!actuel || actuel.famille === 'aucun'}
          onClick={() => actuel && dispatch({ type: 'copierStyle', revetement: actuel })}
        >
          Copier le style
        </Button>
        <Button
          variant="secondaire"
          disabled={!etat.pressePapier}
          onClick={() => dispatch({ type: 'collerStyle' })}
        >
          Coller le style
        </Button>
      </div>
      {niveauDe(etat).pieces.length ? outilZone : null}
    </div>
  );
}
