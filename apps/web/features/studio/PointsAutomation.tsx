'use client';

import {
  ajouterPoint,
  supprimerPoint,
  tempsMontage,
  valeurAutomation,
  type Clip,
  type Frise,
} from '@ph/core/studio';
import { XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Curseur, pourcent } from './Curseur';

/**
 * Automation d'un clip (volume ou opacité) : poser un point à la tête de lecture avec la valeur
 * choisie ; la courbe relie les points (visible sur le clip dans la frise).
 */
export function PointsAutomation(p: {
  frise: Frise;
  clip: Clip;
  param: 'volume' | 'opacite';
  tete: number;
  changer: (f: Frise) => void;
}) {
  const c = p.clip;
  const local = Math.round(p.tete - c.debut);
  const dedans = local >= 0 && local <= c.duree;
  const pts = c.automations?.[p.param] ?? [];
  const [valeur, setValeur] = useState(() => valeurAutomation(pts, Math.max(0, local), 1));
  const max = p.param === 'volume' ? 2 : 1;
  return (
    <fieldset className="grid gap-2 rounded-[8px] border border-montage-trait p-2">
      <legend className="px-1 text-xs font-semibold">
        Automation {p.param === 'volume' ? 'du volume' : 'de l’opacité'}
      </legend>
      <Curseur
        libelle="Valeur du point"
        valeur={Math.min(valeur, max)}
        min={0}
        max={max}
        pas={0.05}
        neutre={1}
        affichage={pourcent}
        onChange={setValeur}
      />
      <button
        type="button"
        disabled={!dedans}
        onClick={() => p.changer(ajouterPoint(p.frise, c.id, p.param, { t: local, v: valeur }))}
        className="min-h-10 rounded-[8px] bg-montage-surface text-sm font-semibold hover:bg-montage-survol disabled:opacity-40"
      >
        {dedans ? `Poser un point à ${tempsMontage(local)}` : 'Placez la tête sur le clip'}
      </button>
      {pts.length ? (
        <ul className="m-0 grid list-none gap-1 p-0 text-xs">
          {pts.map((x) => (
            <li key={x.t} className="flex items-center justify-between gap-2">
              <span className="tabular-nums">
                {tempsMontage(x.t)} · {pourcent(x.v)}
              </span>
              <button
                type="button"
                aria-label={`Supprimer le point à ${tempsMontage(x.t)}`}
                onClick={() => p.changer(supprimerPoint(p.frise, c.id, p.param, x.t))}
                className="flex size-8 items-center justify-center rounded-[6px] hover:bg-montage-survol"
              >
                <XIcon size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
