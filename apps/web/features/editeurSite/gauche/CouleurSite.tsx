'use client';

import { couleur as schemaCouleur } from '@ph/core/sites';
import { nuancierEditeur } from '@ph/ui/tokens';
import { useState } from 'react';

/** Couleur de la palette du site : nuancier du navigateur ou valeur saisie (#hex, rgb(), hsl()). */
export function CouleurSite({
  libelle,
  valeur,
  onChange,
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
}) {
  const [saisie, setSaisie] = useState(valeur);
  const valider = (v: string) => {
    const r = schemaCouleur.safeParse(v.trim().toLowerCase());
    if (r.success && /^(#|rgb|hsl)/.test(r.data)) onChange(r.data);
    else setSaisie(valeur);
  };
  return (
    <div className="flex items-center gap-2.5">
      <label
        className="relative size-11 flex-none cursor-pointer overflow-hidden rounded-[10px] border border-trait"
        title="Ouvrir le nuancier"
        style={{ background: valeur }}
      >
        <span className="sr-only">{libelle} : nuancier</span>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(valeur) ? valeur : nuancierEditeur.defaut}
          onChange={(e) => {
            setSaisie(e.target.value);
            onChange(e.target.value);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <label className="grid min-w-0 flex-1 gap-0.5 text-xs font-semibold text-neutre-700">
        {libelle}
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onBlur={(e) => valider(e.target.value)}
          className="min-h-11 rounded-[8px] border border-trait px-3 text-base font-normal text-texte"
        />
      </label>
    </div>
  );
}
