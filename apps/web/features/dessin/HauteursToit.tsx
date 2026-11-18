'use client';

import { formatNombre } from '@ph/core/format';
import { Field, Input } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import type { Action } from './etat';

/** Saisie en mètres (virgule ou point), arrondie au centimètre. */
function ChampMetres({
  label,
  aide,
  mm,
  appliquer,
  desactive,
}: {
  label: string;
  aide: string;
  mm: number;
  appliquer: (mm: number) => void;
  desactive?: boolean;
}) {
  const [saisie, setSaisie] = useState<string | null>(null);
  const valider = () => {
    const m = Number((saisie ?? '').replace(',', '.'));
    if (saisie !== null && Number.isFinite(m) && Math.round(m * 1000) !== mm)
      appliquer(Math.round(m * 100) * 10);
    setSaisie(null);
  };
  return (
    <Field label={label} aide={aide}>
      <Input
        inputMode="decimal"
        disabled={desactive}
        value={saisie ?? formatNombre(mm / 1000, 2)}
        onChange={(ev) => setSaisie(ev.target.value)}
        onBlur={valider}
        onKeyDown={(ev) => ev.key === 'Enter' && valider()}
      />
    </Field>
  );
}

/**
 * Hauteurs du toit depuis le sol (DES-16) : au plus bas (égout = haut des murs) et au plus
 * haut (faîtage). La pente se calcule seule ; on peut aussi la régler au curseur.
 */
export function HauteursToit({
  egout,
  faitage,
  plat,
  dispatch,
}: {
  egout: number;
  faitage: number;
  plat: boolean;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ChampMetres
        key={`e${egout}`}
        label="Au plus bas (m)"
        aide="Égout, depuis le sol"
        mm={egout}
        appliquer={(v) => dispatch({ type: 'hauteursToit', egout: v })}
      />
      <ChampMetres
        key={`f${faitage}`}
        label="Au plus haut (m)"
        aide={plat ? 'Toit plat : sans faîtage' : 'Faîtage, depuis le sol'}
        mm={faitage}
        desactive={plat}
        appliquer={(v) => dispatch({ type: 'hauteursToit', faitage: v })}
      />
    </div>
  );
}
