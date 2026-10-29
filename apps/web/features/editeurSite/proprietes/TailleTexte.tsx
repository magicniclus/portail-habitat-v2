'use client';

import {
  BORNES_TAILLE,
  bornerTaille,
  convertirTaille,
  UNITES_TAILLE,
  type Appareil,
  type UniteTaille,
} from '@ph/core/sites';
import { useId, useState } from 'react';
import { Libelle } from './controles';
import { NOMS_APPAREIL, pourAppareil, type ContexteReglages } from './contexte';

/**
 * Taille d'un texte par appareil : curseur, valeur saisie librement et unité (px, em, rem, vw, %).
 * Changer d'unité convertit les trois appareils au même rendu.
 */
export function TailleTexte({
  taille,
  unite = 'px',
  plage,
  c,
}: {
  taille: Record<Appareil, number>;
  unite?: UniteTaille;
  /** Plage du curseur en px (le champ accepte plus large). */
  plage: [number, number];
  c: ContexteReglages;
}) {
  const id = useId();
  const a = c.appareil;
  const b =
    unite === 'px' ? { ...BORNES_TAILLE.px, min: plage[0], max: plage[1] } : BORNES_TAILLE[unite];
  const v = taille[a];
  // Saisie en cours (« 1, » avant « 1,5 ») : gardée tant que la valeur ne change pas ailleurs.
  const [saisie, setSaisie] = useState<{ pour: number; texte: string } | null>(null);
  const texte = saisie && saisie.pour === v ? saisie.texte : String(v).replace('.', ',');
  const regler = (x: number) => c.maj({ taille: pourAppareil(taille, a, bornerTaille(x, unite)) });
  return (
    <div className="grid gap-1.5">
      <Libelle texte="Taille" htmlFor={id} droite={NOMS_APPAREIL[a]} />
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label={`Taille (${NOMS_APPAREIL[a]})`}
          min={b.min}
          max={b.max}
          step={b.pas}
          value={Math.min(b.max, Math.max(b.min, v))}
          onChange={(e) => regler(Number(e.target.value))}
          className="min-h-11 min-w-0 flex-1 accent-[color:var(--accent)]"
        />
        <input
          id={id}
          inputMode="decimal"
          value={texte}
          onChange={(e) => {
            setSaisie({ pour: v, texte: e.target.value });
            const n = Number(e.target.value.replace(',', '.'));
            if (e.target.value.trim() && Number.isFinite(n)) regler(n);
          }}
          onBlur={() => setSaisie(null)}
          className="min-h-11 w-[72px] rounded-[8px] border border-trait bg-blanc px-2 text-center text-base"
        />
        <select
          aria-label="Unité de la taille"
          value={unite}
          onChange={(e) => {
            const vers = e.target.value as UniteTaille;
            const conv = (x: number) => convertirTaille(x, unite, vers);
            c.maj({
              unite: vers,
              taille: {
                desktop: conv(taille.desktop),
                tablet: conv(taille.tablet),
                mobile: conv(taille.mobile),
              },
            });
          }}
          className="min-h-11 rounded-[8px] border border-trait bg-blanc px-2 text-base"
        >
          {UNITES_TAILLE.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
