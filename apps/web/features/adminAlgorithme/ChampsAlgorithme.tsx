'use client';

import {
  LIBELLES_OPTIONS_MATCHING,
  LIBELLES_POIDS_MATCHING,
  LIBELLES_SEUILS_MATCHING,
} from '@ph/core/admin';
import type { SaisieConfigMatching } from '@ph/core/matching';
import { Checkbox, Field, Input } from '@ph/ui';

type Poids = keyof typeof LIBELLES_POIDS_MATCHING;
type Seuil = keyof typeof LIBELLES_SEUILS_MATCHING;
type Option = keyof typeof LIBELLES_OPTIONS_MATCHING;

/** Poids (en %, total 100), seuils et options de l'algorithme. */
export function ChampsAlgorithme({
  s,
  changer,
  inactif,
}: {
  s: SaisieConfigMatching;
  changer: (s: SaisieConfigMatching) => void;
  inactif: boolean;
}) {
  const total = Object.values(s.poids).reduce((a, b) => a + b, 0);
  const nombre = (v: string) => Number.parseInt(v || '0', 10);
  const grille = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4';
  return (
    <>
      <fieldset className="grid gap-3 border-0 p-0" disabled={inactif}>
        <legend className="mb-2 font-bold">
          Poids du score · total{' '}
          <span className={total === 100 ? 'text-succes' : 'text-danger'}>{total} %</span>
        </legend>
        <div className={grille}>
          {(Object.keys(LIBELLES_POIDS_MATCHING) as Poids[]).map((k) => (
            <Field key={k} label={`${LIBELLES_POIDS_MATCHING[k]} (%)`}>
              <Input
                inputMode="numeric"
                value={String(s.poids[k])}
                onChange={(e) =>
                  changer({ ...s, poids: { ...s.poids, [k]: nombre(e.target.value) } })
                }
              />
            </Field>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3 border-0 p-0" disabled={inactif}>
        <legend className="mb-2 font-bold">Seuils</legend>
        <div className={grille}>
          {(Object.keys(LIBELLES_SEUILS_MATCHING) as Seuil[]).map((k) => (
            <Field key={k} label={LIBELLES_SEUILS_MATCHING[k]}>
              <Input
                inputMode="numeric"
                value={String(s.seuils[k])}
                onChange={(e) =>
                  changer({ ...s, seuils: { ...s.seuils, [k]: nombre(e.target.value) } })
                }
              />
            </Field>
          ))}
        </div>
        {(Object.keys(LIBELLES_OPTIONS_MATCHING) as Option[]).map((k) => (
          <Checkbox
            key={k}
            checked={s.options[k]}
            onChange={(e) => changer({ ...s, options: { ...s.options, [k]: e.target.checked } })}
          >
            {LIBELLES_OPTIONS_MATCHING[k]}
          </Checkbox>
        ))}
      </fieldset>
    </>
  );
}
