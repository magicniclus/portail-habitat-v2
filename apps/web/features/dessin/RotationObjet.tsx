'use client';

import type { Objet } from '@ph/core/dessin';
import { Button } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import type { Action } from './etat';

type Axe = 'rotation' | 'x' | 'y';
const AXES: { axe: Axe; libelle: string }[] = [
  { axe: 'rotation', libelle: 'Pivoter' },
  { axe: 'x', libelle: 'Basculer avant / arrière' },
  { axe: 'y', libelle: 'Basculer sur le côté' },
];

const degres = (o: Objet, axe: Axe) =>
  Math.round((axe === 'rotation' ? o.rotation : (o.inclinaison?.[axe] ?? 0)) / 10);

function Axe({
  o,
  axe,
  libelle,
  dispatch,
}: {
  o: Objet;
  axe: Axe;
  libelle: string;
  dispatch: Dispatch<Action>;
}) {
  const valeur = degres(o, axe);
  const [saisie, setSaisie] = useState<string | null>(null);
  const geste = `orienter-${o.id}-${axe}`;
  const orienter = (d: number, suivi = false) =>
    dispatch({
      type: 'orienterObjet',
      id: o.id,
      angles: { [axe]: Math.round(d * 10) },
      ...(suivi ? { geste } : {}),
    });
  const valider = () => {
    const d = Number((saisie ?? '').replace(',', '.'));
    if (saisie !== null && Number.isFinite(d)) orienter(d);
    setSaisie(null);
  };
  const id = `axe-${axe}`;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {libelle} · {valeur}°
      </label>
      <div className="flex items-center gap-2">
        {/* Curseur : un seul pas d'historique par geste. */}
        <input
          id={id}
          type="range"
          min={0}
          max={359}
          step={1}
          value={valeur}
          onChange={(ev) => orienter(Number(ev.target.value), true)}
          onPointerUp={() => dispatch({ type: 'finGeste' })}
          onKeyUp={() => dispatch({ type: 'finGeste' })}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <input
          aria-label={`${libelle}, en degrés`}
          inputMode="numeric"
          value={saisie ?? String(valeur)}
          onChange={(ev) => setSaisie(ev.target.value)}
          onBlur={valider}
          onKeyDown={(ev) => ev.key === 'Enter' && valider()}
          className="min-h-11 w-16 rounded-control border border-neutre-300 bg-blanc px-2 text-center text-base"
        />
      </div>
    </div>
  );
}

/** Rotation libre sur 3 axes (au degré), raccourcis d'un quart de tour, remise à plat. */
export function RotationObjet({ o, dispatch }: { o: Objet; dispatch: Dispatch<Action> }) {
  const tourner = (angle: number) => dispatch({ type: 'tournerObjet', id: o.id, angle });
  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="mb-2 text-[13px] font-bold">Rotation</legend>
      {AXES.map((a) => (
        <Axe key={a.axe} o={o} axe={a.axe} libelle={a.libelle} dispatch={dispatch} />
      ))}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondaire"
          aria-label="Pivoter de 90° à gauche"
          onClick={() => tourner(-900)}
        >
          −90°
        </Button>
        <Button
          variant="secondaire"
          aria-label="Pivoter de 90° à droite"
          onClick={() => tourner(900)}
        >
          +90°
        </Button>
        <Button
          variant="secondaire"
          disabled={!o.inclinaison}
          onClick={() => dispatch({ type: 'orienterObjet', id: o.id, angles: { x: 0, y: 0 } })}
        >
          À plat
        </Button>
      </div>
    </fieldset>
  );
}
