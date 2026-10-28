'use client';

import { couleur as schemaCouleur, type Couleur, type Theme } from '@ph/core/sites';
import { cn } from '@ph/ui';
import { nuancierEditeur } from '@ph/ui/tokens';
import { useId, useState } from 'react';
import { Libelle } from './controles';

const NOMS: Record<string, string> = {
  aucun: 'Aucun',
  auto: 'Automatique',
  blanc: 'Blanc',
  clair: 'Clair',
  primaire: 'Principale',
  sombre: 'Sombre',
  accent: 'Accent',
};

/** Valeur affichable d'un jeton du thème (pastilles et nuancier). */
function resoudre(c: Couleur, palette: Theme['palette']): string {
  if (c === 'blanc') return nuancierEditeur.defaut;
  if (c === 'primaire' || c === 'accent' || c === 'clair' || c === 'sombre')
    return resoudre(palette[c], palette);
  return c === 'aucun' || c === 'auto' ? 'transparent' : c;
}

const versHex = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : nuancierEditeur.defaut);

/**
 * Couleur : pastilles des jetons du site, nuancier du navigateur et saisie libre (#hex, rgb(),
 * hsl()), validée par le même schéma que le serveur avant d'être appliquée.
 */
export function Couleurs({
  libelle,
  valeur,
  jetons,
  palette,
  onChange,
  libre = true,
}: {
  libelle: string;
  valeur: Couleur;
  jetons: readonly Couleur[];
  palette: Theme['palette'];
  onChange: (c: Couleur) => void;
  /** Nuancier et saisie libre en plus des jetons. */
  libre?: boolean;
}) {
  const id = useId();
  // Saisie en cours, oubliée dès que la valeur change ailleurs (pastille, nuancier, Ctrl Z).
  const [brouillon, setSaisie] = useState({ pour: valeur, texte: valeur });
  const saisie = brouillon.pour === valeur ? brouillon.texte : valeur;
  const valider = (v: string) => {
    const r = schemaCouleur.safeParse(v.trim().toLowerCase());
    if (r.success) onChange(r.data);
    else setSaisie({ pour: valeur, texte: valeur });
  };
  const libreActive = !jetons.includes(valeur);
  return (
    <div className="grid gap-1.5">
      <Libelle texte={libelle} droite={NOMS[valeur] ?? valeur} />
      <div role="radiogroup" aria-label={libelle} className="flex flex-wrap items-center gap-1.5">
        {jetons.map((j) => (
          <button
            key={j}
            type="button"
            role="radio"
            aria-checked={valeur === j}
            aria-label={NOMS[j] ?? j}
            title={NOMS[j] ?? j}
            onClick={() => onChange(j)}
            className={cn(
              'grid size-11 place-items-center rounded-[10px] border',
              valeur === j ? 'border-2 border-accent' : 'border-trait',
            )}
          >
            <span
              aria-hidden="true"
              className="size-7 rounded-[7px] ring-1 ring-black/10"
              style={{
                background:
                  j === 'aucun' || j === 'auto' ? nuancierEditeur.damier : resoudre(j, palette),
              }}
            />
          </button>
        ))}
        {libre ? (
          <label
            title="Couleur personnalisée"
            className={cn(
              'relative grid size-11 cursor-pointer place-items-center rounded-[10px] border',
              libreActive ? 'border-2 border-accent' : 'border-trait',
            )}
          >
            <span className="sr-only">Couleur personnalisée</span>
            <span
              aria-hidden="true"
              className="size-7 rounded-[7px]"
              style={{
                background: nuancierEditeur.arcEnCiel,
              }}
            />
            <input
              type="color"
              value={versHex(resoudre(valeur, palette))}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        ) : null}
      </div>
      {libre ? (
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-11 flex-none rounded-[10px] border border-trait"
            style={{ background: resoudre(valeur, palette) }}
          />
          <label htmlFor={id} className="sr-only">
            {libelle} : valeur
          </label>
          <input
            id={id}
            value={saisie}
            onChange={(e) => setSaisie({ pour: valeur, texte: e.target.value })}
            onBlur={(e) => valider(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') valider(e.currentTarget.value);
            }}
            placeholder="rgb(29, 79, 115) ou hexadécimal"
            className="min-h-11 min-w-0 flex-1 rounded-[8px] border border-trait px-3 text-base"
          />
        </div>
      ) : null}
    </div>
  );
}
