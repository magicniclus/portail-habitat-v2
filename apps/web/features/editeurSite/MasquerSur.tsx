'use client';

import { APPAREILS, type Appareil } from '@ph/core/sites';
import { Checkbox } from '@ph/ui';

const NOMS_APPAREIL = { desktop: 'ordinateur', tablet: 'tablette', mobile: 'mobile' } as const;

/** Masquage par appareil (SITE-02 : un réglage mobile est sans effet sur l'ordinateur). */
export function MasquerSur({
  masque,
  onChange,
}: {
  masque: Record<Appareil, boolean>;
  onChange: (m: Record<Appareil, boolean>) => void;
}) {
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-1 font-semibold">Masquer sur</legend>
      {APPAREILS.map((a) => (
        <Checkbox
          key={a}
          checked={masque[a]}
          onChange={(e) => onChange({ ...masque, [a]: e.target.checked })}
        >
          {NOMS_APPAREIL[a]}
        </Checkbox>
      ))}
    </fieldset>
  );
}
