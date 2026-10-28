'use client';

import { couleur as schemaCouleur, type Theme } from '@ph/core/sites';
import { cn } from '@ph/ui';
import { nuancierEditeur, palettesSites } from '@ph/ui/tokens';
import { useState } from 'react';

const POLICES: [Theme['polices'], string, string][] = [
  ['archivo', 'Archivo + Source Sans', 'Archivo, Arial, sans-serif'],
  ['dmserif', 'DM Serif + Source Sans', '"DM Serif Display", Georgia, serif'],
  ['barlow', 'Barlow Condensed + Barlow', '"Barlow Condensed", Arial, sans-serif'],
];
const COULEURS: [keyof Theme['palette'], string][] = [
  ['primaire', 'Principale'],
  ['accent', 'Accent'],
  ['clair', 'Fond clair'],
  ['sombre', 'Texte et fonds sombres'],
];
const RAYONS: [Theme['rayonBoutons'], string][] = [
  [2, 'Carrés'],
  [8, 'Arrondis'],
  [999, 'Pilule'],
];

function Couleur({
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

/** Styles du site (maquette) : palettes, couleurs au nuancier ou en valeur, polices, boutons. */
export function PanneauStyles({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const titre = 'text-[13px] font-bold text-neutre-800';
  return (
    <div className="grid gap-5">
      <p className="m-0 text-[13px] text-neutre-700">S’applique à toutes les pages.</p>
      <div className="grid gap-2">
        <span className={titre}>Palettes proposées</span>
        <div role="radiogroup" aria-label="Palettes proposées" className="grid grid-cols-2 gap-2">
          {palettesSites.map(({ nom, ...p }) => {
            const on = (Object.keys(p) as (keyof typeof p)[]).every(
              (k) => theme.palette[k] === p[k],
            );
            return (
              <button
                key={nom}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...theme, palette: p })}
                className={cn(
                  'grid min-h-11 gap-1.5 rounded-[10px] bg-blanc p-2 text-left',
                  on ? 'border-2 border-accent' : 'border border-trait',
                )}
              >
                <span aria-hidden="true" className="flex h-5 overflow-hidden rounded-[5px]">
                  {[p.primaire, p.accent, p.clair, p.sombre].map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span className="text-xs font-semibold">{nom}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-2.5">
        <span className={titre}>
          Couleurs du site <span className="font-normal text-neutre-600">· nuancier ou valeur</span>
        </span>
        {COULEURS.map(([k, l]) => (
          <Couleur
            key={`${k}-${theme.palette[k]}`}
            libelle={l}
            valeur={theme.palette[k]}
            onChange={(v) => onChange({ ...theme, palette: { ...theme.palette, [k]: v } })}
          />
        ))}
      </div>
      <div className="grid gap-2">
        <span className={titre}>Typographie</span>
        <div role="radiogroup" aria-label="Typographie" className="grid gap-2">
          {POLICES.map(([id, nom, famille]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme.polices === id}
              onClick={() => onChange({ ...theme, polices: id })}
              className={cn(
                'flex min-h-11 items-center justify-between gap-2 rounded-[10px] bg-blanc px-3 py-2',
                theme.polices === id ? 'border-2 border-accent' : 'border border-trait',
              )}
            >
              <span className="text-xl" style={{ fontFamily: famille }}>
                Aa
              </span>
              <span className="text-xs font-semibold text-neutre-700">{nom}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <span className={titre}>Forme des boutons</span>
        <div
          role="radiogroup"
          aria-label="Forme des boutons"
          className="flex overflow-hidden rounded-[9px] border border-trait"
        >
          {RAYONS.map(([r, l]) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={theme.rayonBoutons === r}
              onClick={() => onChange({ ...theme, rayonBoutons: r })}
              className={cn(
                'min-h-11 flex-1 border-r border-trait text-[13px] font-semibold last:border-r-0',
                theme.rayonBoutons === r ? 'bg-accent text-blanc' : 'bg-blanc text-neutre-800',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
