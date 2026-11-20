'use client';

import {
  emprisesToit,
  formatLongueur,
  LIBELLES_TOITURE,
  type Niveau,
  type TypeToiture,
} from '@ph/core/dessin';
import { IconButton, Select } from '@ph/ui';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useMemo, type Dispatch } from 'react';
import type { Action } from './etat';

/**
 * Parties du toit (DES-16) : une maison en L, T ou U est couverte par plusieurs parties. Chacune
 * peut garder la forme commune ou prendre la sienne, et tourner son faîtage.
 */
export function PartiesToit({
  niveau,
  dessus,
  dispatch,
}: {
  niveau: Niveau;
  dessus: Niveau | null;
  dispatch: Dispatch<Action>;
}) {
  const parties = useMemo(() => emprisesToit(niveau, dessus), [niveau, dessus]);
  const t = niveau.toiture;
  if (!t || parties.length < 2) return null;
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-1 px-1 text-[13px] font-semibold">Parties du toit</legend>
      <p className="m-0 px-1 text-[13px] leading-5 text-neutre-700">
        Chaque partie de la maison a son toit : choisissez sa forme et le sens de son faîtage.
      </p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {parties.map((p, i) => {
          const reglage = t.parties.find((x) => x.cle === p.cle);
          const nom = `Partie ${i + 1}`;
          return (
            <li
              key={p.cle}
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[10px] bg-neutre-100 p-2"
            >
              <span className="col-span-2 text-sm font-semibold">
                {nom}{' '}
                <span className="font-normal text-neutre-700">
                  · {formatLongueur(p.L0)} × {formatLongueur(p.P0)}
                </span>
              </span>
              <Select
                aria-label={`Forme de la ${nom.toLowerCase()}`}
                value={reglage?.type ?? ''}
                onChange={(ev) =>
                  dispatch({
                    type: 'partieToit',
                    cle: p.cle,
                    forme: (ev.target.value || null) as TypeToiture | null,
                  })
                }
              >
                <option value="">Comme le reste ({LIBELLES_TOITURE[t.type].toLowerCase()})</option>
                {(Object.keys(LIBELLES_TOITURE) as TypeToiture[]).map((k) => (
                  <option key={k} value={k}>
                    {LIBELLES_TOITURE[k]}
                  </option>
                ))}
              </Select>
              <IconButton
                aria-label={`Tourner le faîtage de la ${nom.toLowerCase()}`}
                aria-pressed={Boolean(reglage?.tourner)}
                icone={<ArrowsClockwiseIcon />}
                onClick={() =>
                  dispatch({ type: 'partieToit', cle: p.cle, tourner: !reglage?.tourner })
                }
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
