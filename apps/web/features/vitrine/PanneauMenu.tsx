'use client';

import { bouton, Logo, PanneauPleinEcran } from '@ph/ui';
import Link from 'next/link';
import type { RefObject } from 'react';
import type { LienNav } from './EnTetePublic';

/** Contenu du menu mobile, chargé à la première ouverture (Radix Dialog hors du JavaScript initial). */
export default function PanneauMenu({
  liens,
  principal,
  secondaire,
  variantLogo,
  ouvert,
  onOuvertChange,
  retourFocus,
}: {
  liens: LienNav[];
  principal: LienNav;
  secondaire?: LienNav;
  variantLogo: 'particulier' | 'pro' | 'diag';
  ouvert: boolean;
  onOuvertChange: (o: boolean) => void;
  retourFocus: RefObject<HTMLButtonElement | null>;
}) {
  const fermer = () => onOuvertChange(false);
  const boutonPrincipal = (
    <Link
      href={principal.href}
      prefetch={principal.prefetch}
      onClick={fermer}
      className={bouton({ taille: 'lg', pleineLargeur: true })}
    >
      {principal.libelle}
    </Link>
  );
  return (
    <PanneauPleinEcran
      titre="Menu principal"
      entete={<Logo variant={variantLogo} taille={32} />}
      ouvert={ouvert}
      onOuvertChange={onOuvertChange}
      retourFocus={retourFocus}
      pied={
        <>
          {boutonPrincipal}
          {secondaire ? (
            <Link
              href={secondaire.href}
              prefetch={secondaire.prefetch}
              onClick={fermer}
              className={bouton({ variant: 'secondaire', taille: 'lg', pleineLargeur: true })}
            >
              {secondaire.libelle}
            </Link>
          ) : null}
        </>
      }
    >
      {liens.map((l) => (
        <Link
          key={l.libelle}
          href={l.href}
          prefetch={l.prefetch}
          onClick={fermer}
          className="flex min-h-[52px] items-center text-[19px] font-semibold text-texte no-underline"
        >
          {l.libelle}
        </Link>
      ))}
    </PanneauPleinEcran>
  );
}
