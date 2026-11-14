'use client';

import type { Champ, Reponse } from '@ph/core/simulateur';
import { Chip, ChipGroup, RadioCard, RadioCardGroup } from '@ph/ui';
import { useId } from 'react';

const num = (n: number) => String(n).replace('.', ',');

const classeStepper =
  'grid size-11 flex-none cursor-pointer place-items-center rounded-[12px] border border-neutre-400 bg-blanc text-[22px] leading-none text-accent-700 hover:border-accent hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-40';

/** Une question du simulateur (maquette : curseur, compteur, choix unique, options multiples). */
export function ChampQuestion({
  champ: c,
  valeur,
  onChange,
}: {
  champ: Champ;
  valeur: Reponse | undefined;
  onChange: (v: Reponse) => void;
}) {
  const id = useId();
  const idAide = c.aide ? `${id}-aide` : undefined;
  const aide = c.aide ? (
    <p id={idAide} className="m-0 mb-3 text-sm leading-[21px] text-neutre-800">
      {c.aide}
    </p>
  ) : null;

  if (c.kind === 'options')
    return (
      <RadioCardGroup
        legende={
          <>
            <span className="block text-[16.5px] font-bold">{c.label}</span>
            {c.aide ? (
              <span className="mb-1 block text-sm leading-[21px] font-normal text-neutre-800">
                {c.aide}
              </span>
            ) : null}
          </>
        }
      >
        {c.options.map((o) => (
          <RadioCard
            key={o.v}
            name={`${id}-${c.id}`}
            value={o.v}
            checked={valeur === o.v}
            onChange={() => onChange(o.v)}
            titre={o.label}
            description={o.desc}
          />
        ))}
      </RadioCardGroup>
    );

  if (c.kind === 'chips') {
    const liste = Array.isArray(valeur) ? valeur : [];
    return (
      <div>
        <p className="m-0 mb-1 text-[16.5px] font-bold" id={`${id}-titre`}>
          {c.label}
        </p>
        {aide}
        <ChipGroup libelle={c.label}>
          {c.options.map((o) => {
            const actif = liste.includes(o.v);
            return (
              <Chip
                key={o.v}
                selectionne={actif}
                onClick={() => onChange(actif ? liste.filter((x) => x !== o.v) : [...liste, o.v])}
              >
                {o.label}
              </Chip>
            );
          })}
        </ChipGroup>
      </div>
    );
  }

  const v = typeof valeur === 'number' ? valeur : c.def;
  if (c.kind === 'slider')
    return (
      <div>
        <label htmlFor={id} className="m-0 mb-1 block text-[16.5px] font-bold">
          {c.label}
        </label>
        {aide}
        <p className="m-0 mb-1.5 flex items-baseline gap-2" aria-hidden="true">
          <span className="text-[27px] font-bold text-accent-700">{num(v)}</span>
          <span className="text-[15px] text-neutre-800">{c.unite}</span>
        </p>
        <input
          id={id}
          type="range"
          min={c.min}
          max={c.max}
          step={c.pas ?? 1}
          value={v}
          aria-describedby={idAide}
          aria-valuetext={`${num(v)} ${c.unite}`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-full cursor-pointer accent-accent-action"
        />
        <p className="m-0 flex justify-between text-[12.5px] text-neutre-700" aria-hidden="true">
          <span>
            {num(c.min)} {c.unite}
          </span>
          <span>
            {num(c.max)} {c.unite}
          </span>
        </p>
      </div>
    );

  return (
    <div role="group" aria-labelledby={`${id}-titre`} aria-describedby={idAide}>
      <p className="m-0 mb-1 text-[16.5px] font-bold" id={`${id}-titre`}>
        {c.label}
      </p>
      {aide}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label={`Diminuer : ${c.label}`}
          disabled={v <= c.min}
          onClick={() => onChange(Math.max(c.min, v - 1))}
          className={classeStepper}
        >
          −
        </button>
        <output aria-live="polite" className="min-w-[74px] text-center text-[25px] font-bold">
          {v}
        </output>
        <button
          type="button"
          aria-label={`Augmenter : ${c.label}`}
          disabled={v >= c.max}
          onClick={() => onChange(Math.min(c.max, v + 1))}
          className={classeStepper}
        >
          +
        </button>
        <span className="text-[15px] text-neutre-800">{c.unite}</span>
      </div>
    </div>
  );
}
