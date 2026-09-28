'use client';

import { bouton, Logo, PanneauPleinEcran } from '@ph/ui';
import Link from 'next/link';
import type { RefObject } from 'react';
import type { LienNav } from './EnTetePublic';

/** Contenu du menu mobile, chargé à la première ouverture (Radix Dialog hors du JavaScript initial). */
export default function PanneauMenu({
  liens,
  principal,
  variantLogo,
  ouvert,
  onOuvertChange,
  retourFocus,
}: {
  liens: LienNav[];
  principal: LienNav;
  variantLogo: 'particulier' | 'pro' | 'diag';
  ouvert: boolean;
  onOuvertChange: (o: boolean) => void;
  retourFocus: RefObject<HTMLButtonElement | null>;
}) {
  const fermer = () => onOuvertChange(false);
  return (
    <PanneauPleinEcran
      titre="Menu principal"
      entete={<Logo variant={variantLogo} taille={32} />}
      ouvert={ouvert}
      onOuvertChange={onOuvertChange}
      retourFocus={retourFocus}
    >
      {liens.map((l) => (
        <Link
          key={l.libelle}
          href={l.href}
          onClick={fermer}
          className="flex min-h-14 items-center border-b border-trait text-lg font-semibold text-texte no-underline"
        >
          {l.libelle}
        </Link>
      ))}
      <Link
        href={principal.href}
        onClick={fermer}
        className={bouton({ taille: 'lg', pleineLargeur: true, className: 'mt-4' })}
      >
        {principal.libelle}
      </Link>
    </PanneauPleinEcran>
  );
}
