'use client';

import {
  FINITIONS_PEINTURE,
  LIBELLES_FINITION,
  peinture,
  type FinitionPeinture,
  type Revetement,
} from '@ph/core/dessin';
import { Field, Select } from '@ph/ui';
import { PEINTURES_DESSIN } from '@ph/ui/tokens';

/** Blanc du nuancier : couleur de départ d'une surface pas encore peinte. */
const BLANC = PEINTURES_DESSIN[0]!.couleur;

/**
 * Peinture (DES-25) : couleur libre (nuancier du navigateur) et finition mat, satin ou
 * brillant, appliquées à la surface choisie ; les teintes du catalogue restent en dessous.
 */
export function ReglagesPeinture({
  actuel,
  appliquer,
}: {
  actuel: Revetement | null;
  appliquer: (r: Revetement) => void;
}) {
  const p = actuel?.famille === 'peinture' ? actuel : null;
  const changer = (modif: { couleur?: string; finition?: FinitionPeinture }) => {
    const r = peinture(actuel, modif, BLANC);
    if (r) appliquer(r);
  };
  return (
    <div className="grid grid-cols-2 gap-3 px-1">
      <label className="grid gap-1 text-[13px] font-semibold">
        Couleur libre
        <input
          type="color"
          value={p?.couleur ?? BLANC}
          onChange={(ev) => changer({ couleur: ev.target.value })}
          className="h-11 w-full cursor-pointer rounded-control border border-neutre-300 bg-blanc p-1"
        />
      </label>
      <Field label="Finition">
        <Select
          value={p?.finition ?? 'mat'}
          onChange={(ev) => changer({ finition: ev.target.value as FinitionPeinture })}
        >
          {FINITIONS_PEINTURE.map((f) => (
            <option key={f} value={f}>
              {LIBELLES_FINITION[f]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
