'use client';

import { LIBELLES_NATURE_LIGNE, TAUX_TVA, type TauxTva } from '@ph/core/devis';
import { formatEuros, parseEuros } from '@ph/core/format';
import type { ReactNode } from 'react';
import type { LigneSaisie } from '../etat';
import { ChampFeuille, ZoneFeuille } from './ChampFeuille';
import { MenuLigne } from './MenuLigne';

const nombre = (s: string) => Number(s.replace(',', '.').replace(/\s/g, '')) || 0;
const selectFeuille =
  'min-h-9 w-full rounded-[6px] border border-transparent bg-transparent px-1 text-base hover:border-dashed hover:border-neutre-400 focus:border-accent focus:outline-none sm:text-[15px]';

/**
 * Colonnes des lignes, partagées avec l'en-tête du tableau. Mobile : désignation pleine largeur,
 * puis les chiffres sur une rangée ; à partir de 640 px, un tableau.
 */
export const COLONNES = {
  complet: 'grid-cols-4 sm:grid-cols-[minmax(0,1fr)_52px_52px_84px_72px_92px_44px]',
  rapide: 'grid-cols-2 sm:grid-cols-[minmax(0,1fr)_76px_112px_44px]',
} as const;

/** Libellé court visible sous 640 px seulement (au-dessus, l'en-tête du tableau suffit). */
function Case({
  titre,
  children,
  className,
}: {
  titre: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`grid min-w-0 ${className ?? ''}`}>
      <span aria-hidden="true" className="px-1.5 text-[11px] text-neutre-700 sm:hidden">
        {titre}
      </span>
      {children}
    </span>
  );
}

/** Une ligne de la feuille : chiffrée (quantité, unité, PU HT, TVA, total) ou texte seul. */
export function LigneFeuille({
  l,
  n,
  rapide,
  avecCout,
  maj,
  supprimer,
  enregistrerType,
}: {
  l: LigneSaisie;
  n: number;
  rapide: boolean;
  avecCout: boolean;
  maj: (patch: Partial<LigneSaisie>) => void;
  supprimer: (() => void) | null;
  enregistrerType: () => void;
}) {
  const texte = l.type === 'texte';
  const menu = (
    <MenuLigne
      n={n}
      nature={texte ? null : l.nature}
      onNature={(nature) => maj({ nature })}
      enregistrer={l.designation.trim() ? enregistrerType : null}
      supprimer={supprimer}
    />
  );
  const designation = (
    <span className="flex min-w-0 flex-1 items-start gap-1 sm:contents">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <ZoneFeuille
          aria-label={texte ? 'Texte de la ligne' : 'Désignation'}
          placeholder={texte ? 'Titre ou précision (sans prix)' : 'Désignation'}
          value={l.designation}
          onChange={(x) => maj({ designation: x.target.value })}
          className={texte ? 'font-semibold' : ''}
        />
        {!texte && (l.nature === 'fourniture' || (avecCout && !rapide)) ? (
          <span className="flex flex-wrap items-center gap-2 px-1.5 text-xs text-neutre-700">
            {l.nature === 'fourniture' ? (
              <span className="rounded-pill bg-neutre-100 px-2 py-0.5 font-semibold">
                {LIBELLES_NATURE_LIGNE.fourniture}
              </span>
            ) : null}
            {avecCout && !rapide ? (
              <label className="flex items-center gap-1">
                Coût HT (privé)
                <ChampFeuille
                  aria-label="Coût HT (privé)"
                  inputMode="decimal"
                  value={l.cout}
                  onChange={(x) => maj({ cout: x.target.value })}
                  className="min-h-7 w-24 text-sm sm:text-xs"
                />
              </label>
            ) : null}
          </span>
        ) : null}
      </span>
      <span className="sm:hidden">{menu}</span>
    </span>
  );
  if (texte)
    return (
      <div
        role="group"
        aria-label={`Ligne ${n}`}
        className="flex items-start gap-1 border-b border-trait py-1.5"
      >
        {designation}
        <span className="hidden sm:block">{menu}</span>
      </div>
    );

  const total = Math.round(nombre(l.quantite) * (parseEuros(l.puHt) ?? 0));
  const tva = (
    <Case titre="TVA">
      <select
        aria-label="TVA"
        value={String(l.tva)}
        onChange={(x) => maj({ tva: Number(x.target.value) as TauxTva })}
        className={selectFeuille}
      >
        {TAUX_TVA.map((t) => (
          <option key={t} value={t}>
            {String(t).replace('.', ',')} %
          </option>
        ))}
      </select>
    </Case>
  );
  const prix = (label: string, titre: string) => (
    <Case titre={titre}>
      <ChampFeuille
        aria-label={label}
        inputMode="decimal"
        placeholder="0,00"
        value={l.puHt}
        onChange={(x) => maj({ puHt: x.target.value })}
        className="text-right"
      />
    </Case>
  );
  return (
    <div
      role="group"
      aria-label={`Ligne ${n}`}
      className={`grid items-start gap-x-1 gap-y-0.5 border-b border-trait py-1.5 ${rapide ? COLONNES.rapide : COLONNES.complet}`}
    >
      <span className={`min-w-0 sm:col-span-1 ${rapide ? 'col-span-2' : 'col-span-4'}`}>
        {designation}
      </span>
      {rapide ? (
        <>
          {tva}
          {prix('Montant HT (€)', 'Montant HT')}
        </>
      ) : (
        <>
          <Case titre="Qté">
            <ChampFeuille
              aria-label="Quantité"
              inputMode="decimal"
              value={l.quantite}
              onChange={(x) => maj({ quantite: x.target.value })}
              className="text-right"
            />
          </Case>
          <Case titre="Unité">
            <ChampFeuille
              aria-label="Unité"
              value={l.unite}
              onChange={(x) => maj({ unite: x.target.value })}
            />
          </Case>
          {prix('PU HT (€)', 'PU HT')}
          {tva}
          <span
            className="col-span-4 self-center px-1.5 text-right text-[15px] font-semibold tabular-nums sm:col-span-1"
            aria-label={`Total HT de la ligne ${n}`}
          >
            {formatEuros(total, { decimales: 'toujours' })}
          </span>
        </>
      )}
      <span className="hidden sm:block">{menu}</span>
    </div>
  );
}
