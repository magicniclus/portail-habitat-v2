'use client';

import { TAUX_TVA, UNITES_LIGNE, type NatureLigne, type TauxTva } from '@ph/core/devis';
import { formatEuros, parseEuros } from '@ph/core/format';
import { cn } from '@ph/ui';
import type { ReactNode } from 'react';
import type { LigneSaisie } from '../etat';
import { caseLigne, COLONNES } from './CasesFeuille';
import { MenuLigne } from './MenuLigne';

const estUnite = (u: string) => (UNITES_LIGNE as readonly string[]).includes(u);
const nombre = (s: string) => Number(s.replace(',', '.').replace(/\s/g, '')) || 0;

/** Libellé court visible sous 640 px seulement (au-dessus, l'en-tête coloré suffit). */
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
    <span className={cn('grid min-w-0', className)}>
      <span aria-hidden="true" className="px-1 text-[11px] text-neutre-700 sm:hidden">
        {titre}
      </span>
      {children}
    </span>
  );
}

/**
 * Une ligne de la feuille (captures) : « Presta ▾ » (prestation ou fourniture), désignation,
 * quantité, unité, prix unitaire, TVA, montant HT ; ou texte seul. Menu ⋯ : ligne type, retirer.
 */
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
      nature={null}
      onNature={() => undefined}
      enregistrer={l.designation.trim() ? enregistrerType : null}
      supprimer={supprimer}
    />
  );
  const designation = (
    <textarea
      rows={1}
      aria-label={texte ? 'Texte de la ligne' : 'Désignation'}
      placeholder={texte ? 'Titre ou précision (sans prix)' : 'Désignation'}
      value={l.designation}
      onChange={(x) => maj({ designation: x.target.value })}
      className={cn(
        caseLigne,
        'resize-none py-2.5 [field-sizing:content]',
        texte && 'font-semibold',
      )}
    />
  );
  if (texte)
    return (
      <div
        role="group"
        aria-label={`Ligne ${n}`}
        className="grid grid-cols-[minmax(0,1fr)_44px] items-start gap-1.5"
      >
        {designation}
        {menu}
      </div>
    );

  const total = Math.round(nombre(l.quantite) * (parseEuros(l.puHt) ?? 0));
  const nature = (
    <Case titre="Type">
      <select
        aria-label="Nature"
        value={l.nature}
        onChange={(x) => maj({ nature: x.target.value as NatureLigne })}
        className={cn(caseLigne, 'border-solid border-trait px-2 font-semibold')}
      >
        <option value="prestation">Presta</option>
        <option value="fourniture">Fourn.</option>
      </select>
    </Case>
  );
  const tva = (
    <Case titre="TVA">
      <select
        aria-label="TVA"
        value={String(l.tva)}
        onChange={(x) => maj({ tva: Number(x.target.value) as TauxTva })}
        className={cn(caseLigne, 'px-1.5')}
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
      <input
        aria-label={label}
        inputMode="decimal"
        placeholder="0,00"
        value={l.puHt}
        onChange={(x) => maj({ puHt: x.target.value })}
        className={cn(caseLigne, 'text-right')}
      />
    </Case>
  );
  return (
    <div className="grid gap-1">
      <div
        role="group"
        aria-label={`Ligne ${n}`}
        className={cn('grid items-start gap-1.5', rapide ? COLONNES.rapide : COLONNES.complet)}
      >
        {nature}
        <span className={cn('min-w-0 sm:col-span-1', rapide ? 'col-span-1' : 'col-span-3')}>
          {designation}
        </span>
        {rapide ? (
          <>
            {tva}
            {prix('Montant HT (€)', 'Montant HT')}
          </>
        ) : (
          <>
            <Case titre="Quantité">
              <input
                aria-label="Quantité"
                inputMode="decimal"
                value={l.quantite}
                onChange={(x) => maj({ quantite: x.target.value })}
                className={cn(caseLigne, 'text-right')}
              />
            </Case>
            <Case titre="Unité">
              <select
                aria-label="Unité"
                value={l.unite}
                onChange={(x) => maj({ unite: x.target.value })}
                className={cn(caseLigne, 'px-1.5')}
              >
                <option value="">Aucune</option>
                {[...UNITES_LIGNE, ...(l.unite && !estUnite(l.unite) ? [l.unite] : [])].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Case>
            {prix('PU HT (€)', 'Prix unitaire')}
            {tva}
            <span
              className="col-span-2 flex min-h-11 items-center justify-end px-1.5 text-[15px] font-semibold tabular-nums sm:col-span-1"
              aria-label={`Total HT de la ligne ${n}`}
            >
              {formatEuros(total, { decimales: 'toujours' })}
            </span>
          </>
        )}
        <span className="justify-self-end">{menu}</span>
      </div>
      {avecCout && !rapide ? (
        <label className="flex items-center gap-2 pl-[102px] text-sm text-neutre-700">
          Coût d’achat HT (privé)
          <input
            aria-label="Coût HT (privé)"
            inputMode="decimal"
            value={l.cout}
            onChange={(x) => maj({ cout: x.target.value })}
            className={cn(caseLigne, 'w-28 text-right')}
          />
        </label>
      ) : null}
    </div>
  );
}
