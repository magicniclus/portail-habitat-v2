'use client';

import { LIBELLES_CALQUE, POSITIONS, type Calque } from '@ph/core/studio';
import { Button, Field, Input, Select } from '@ph/ui';
import { ChampsCalque } from './ChampsCalque';

const LIBELLES_POSITION: Record<(typeof POSITIONS)[number], string> = {
  haut: 'En haut',
  centre: 'Au centre',
  bas: 'En bas',
};

/** Secondes à une décimale ⇄ millisecondes entières. */
const enS = (ms: number) => String(Math.round(ms / 100) / 10);
const enMs = (s: string) => Math.max(0, Math.round(Number(s.replace(',', '.')) * 1000) || 0);

/** Réglages de l'animation choisie : son contenu, sa place, son moment dans le plan. */
export function ProprietesCalque({
  calque: c,
  dureePlanMs,
  onChange,
  onSupprimer,
}: {
  calque: Calque;
  dureePlanMs: number;
  onChange: (champs: Partial<Calque>) => void;
  onSupprimer: () => void;
}) {
  const position =
    'position' in c ? (
      <Field label="Position">
        <Select
          value={c.position}
          onChange={(e) => onChange({ position: e.target.value as (typeof POSITIONS)[number] })}
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {LIBELLES_POSITION[p]}
            </option>
          ))}
        </Select>
      </Field>
    ) : null;
  const coord = (cle: 'x' | 'y' | 'largeur' | 'hauteur', libelle: string) =>
    cle in c ? (
      <Field
        label={`${libelle} : ${Math.round((c as unknown as Record<string, number>)[cle]! * 100)} %`}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((c as unknown as Record<string, number>)[cle]! * 100)}
          onChange={(e) => onChange({ [cle]: Number(e.target.value) / 100 } as Partial<Calque>)}
          className="min-h-11 w-full"
        />
      </Field>
    ) : null;
  return (
    <div className="grid content-start gap-3">
      <h3 className="m-0 text-base">{LIBELLES_CALQUE[c.type]}</h3>
      <ChampsCalque calque={c} onChange={onChange} />
      {coord('x', 'Horizontal')}
      {coord('y', 'Vertical')}
      {coord('largeur', 'Largeur')}
      {coord('hauteur', 'Hauteur')}
      {position}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Début (s)">
          <Input
            inputMode="decimal"
            value={enS(c.debut)}
            onChange={(e) => onChange({ debut: Math.min(enMs(e.target.value), c.fin - 100) })}
          />
        </Field>
        <Field label="Fin (s)">
          <Input
            inputMode="decimal"
            value={enS(c.fin)}
            onChange={(e) =>
              onChange({
                fin: Math.min(dureePlanMs, Math.max(enMs(e.target.value), c.debut + 100)),
              })
            }
          />
        </Field>
      </div>
      <div>
        <Button variant="fantome" onClick={onSupprimer}>
          Supprimer l’animation
        </Button>
      </div>
    </div>
  );
}
