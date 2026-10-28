'use client';

import type { Theme } from '@ph/core/sites';
import { cn } from '@ph/ui';
import { palettesSites } from '@ph/ui/tokens';
import { CouleurSite } from './CouleurSite';

const POLICES: [Theme['polices'], string, string][] = [
  ['archivo', 'Archivo + Source Sans', 'Archivo, Arial, sans-serif'],
  ['dmserif', 'DM Serif + Source Sans', '"DM Serif Display", Georgia, serif'],
  ['barlow', 'Barlow Condensed + Barlow', '"Barlow Condensed", Arial, sans-serif'],
];
const COULEURS: [keyof Theme['palette'], string][] = [
  ['primaire', 'Couleur principale'],
  ['accent', 'Couleur d’accent'],
  ['clair', 'Fond clair'],
  ['sombre', 'Fond sombre et textes'],
];
const LARGEURS: [NonNullable<Theme['largeurContenu']>, string][] = [
  [960, 'Étroite'],
  [1120, 'Normale'],
  [1280, 'Large'],
];
const RAYONS: [Theme['rayonBoutons'], string][] = [
  [2, 'Carrés'],
  [8, 'Arrondis'],
  [999, 'Pilule'],
];

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
          <CouleurSite
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
        <span className={titre}>
          Largeur maximale du contenu{' '}
          <span className="font-normal text-neutre-600">· les fonds restent pleine largeur</span>
        </span>
        <div
          role="radiogroup"
          aria-label="Largeur maximale du contenu"
          className="flex overflow-hidden rounded-[9px] border border-trait"
        >
          {LARGEURS.map(([l, nom]) => {
            const on = (theme.largeurContenu ?? 1120) === l;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...theme, largeurContenu: l })}
                className={cn(
                  'grid min-h-11 flex-1 border-r border-trait py-1 text-[13px] leading-tight font-semibold last:border-r-0',
                  on ? 'bg-accent text-blanc' : 'bg-blanc text-neutre-800',
                )}
              >
                {nom}
                <span className="text-[11px] font-normal opacity-80">{l} px</span>
              </button>
            );
          })}
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
