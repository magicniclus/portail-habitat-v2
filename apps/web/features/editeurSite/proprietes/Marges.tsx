'use client';

import { margesDe, reglerMarge, type Element, type Marges as M } from '@ph/core/sites';
import { useId } from 'react';
import { Groupe } from './controles';
import { NOMS_APPAREIL, type ContexteReglages } from './contexte';

const COTES: [keyof M, string][] = [
  ['h', 'Haut'],
  ['d', 'Droite'],
  ['b', 'Bas'],
  ['g', 'Gauche'],
];

/**
 * Marges du contenu autour de lui, par appareil : schéma de boîte (haut au-dessus, côtés de part
 * et d'autre, bas en dessous) comme les éditeurs de pages courants. Un réglage sur ordinateur
 * descend vers la tablette et le mobile tant qu'ils n'ont pas leur propre valeur.
 */
export function Marges({ el, c }: { el: Element; c: ContexteReglages }) {
  const id = useId();
  const m = margesDe(el.p)[c.appareil];
  const champ = (cote: keyof M, libelle: string) => (
    <label className="grid justify-items-center gap-0.5 text-[11px] font-semibold text-neutre-600">
      <span className="sr-only">
        Marge {libelle.toLowerCase()} ({NOMS_APPAREIL[c.appareil]})
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={200}
        value={m[cote]}
        onChange={(e) => {
          const v = Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0)));
          c.maj(reglerMarge(el.p, c.appareil, cote, v));
        }}
        className="min-h-11 w-16 rounded-[8px] border border-trait bg-blanc px-1 text-center text-base"
      />
      <span aria-hidden="true">{libelle}</span>
    </label>
  );
  return (
    <Groupe titre="Marges">
      <p id={id} className="m-0 text-xs text-neutre-600">
        En pixels, sur {NOMS_APPAREIL[c.appareil].toLowerCase()}
        {c.appareil === 'desktop' ? ' (la tablette et le mobile suivent)' : ''}.
      </p>
      <div
        aria-describedby={id}
        className="grid grid-cols-[1fr_auto_1fr] items-center justify-items-center gap-1.5 rounded-[10px] border border-dashed border-neutre-300 bg-neutre-100 p-2"
      >
        <span />
        {champ('h', COTES[0]![1])}
        <span />
        {champ('g', COTES[3]![1])}
        <span
          aria-hidden="true"
          className="grid h-11 w-20 place-items-center rounded-[6px] border border-trait bg-blanc text-[11px] font-semibold text-neutre-600"
        >
          Contenu
        </span>
        {champ('d', COTES[1]![1])}
        <span />
        {champ('b', COTES[2]![1])}
        <span />
      </div>
    </Groupe>
  );
}
