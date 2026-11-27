'use client';

import {
  emprisesToit,
  formatLongueur,
  LIBELLES_TOITURE,
  type Niveau,
  type TypeToiture,
} from '@ph/core/dessin';
import { Select } from '@ph/ui';
import { useMemo, type Dispatch } from 'react';
import type { Action } from './etat';
import { LIBELLES_DESCENTE, LIBELLES_SENS, type Descente, type Sens } from './SensToit';

/**
 * Parties du toit (DES-16) : une maison en L, T ou U est couverte par plusieurs parties. Chacune
 * peut garder la forme et le sens communs ou prendre les siens.
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
        Chaque partie de la maison a son toit : choisissez sa forme et son sens.
      </p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {parties.map((p, i) => {
          const reglage = t.parties.find((x) => x.cle === p.cle);
          const nom = `Partie ${i + 1}`;
          const forme = reglage?.type ?? t.type;
          const mono = forme === 'monopente';
          return (
            <li key={p.cle} className="grid items-center gap-2 rounded-[10px] bg-neutre-100 p-2">
              <span className="text-sm font-semibold">
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
              <Select
                aria-label={`Sens de la ${nom.toLowerCase()}`}
                value={(mono ? reglage?.descente : reglage?.sens) ?? ''}
                onChange={(ev) => {
                  const v = ev.target.value || null;
                  dispatch(
                    mono
                      ? { type: 'partieToit', cle: p.cle, descente: v as Descente | null }
                      : { type: 'partieToit', cle: p.cle, sens: v as Sens | null },
                  );
                }}
              >
                <option value="">Sens : comme le reste</option>
                {Object.entries(mono ? LIBELLES_DESCENTE : LIBELLES_SENS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
