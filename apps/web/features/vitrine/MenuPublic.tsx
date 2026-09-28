'use client';

import { bouton, Logo, MenuPleinEcran } from '@ph/ui';
import Link from 'next/link';
import type { LienNav } from './EnTetePublic';

/** Menu plein écran sous 1024 px (MOBILE §6, ACC-04) : entrées de 56 px, fermeture au clic. */
export function MenuPublic({
  liens,
  principal,
  variantLogo,
}: {
  liens: LienNav[];
  principal: LienNav;
  variantLogo: 'particulier' | 'pro' | 'diag';
}) {
  return (
    <MenuPleinEcran
      titre="Menu principal"
      entete={<Logo variant={variantLogo} taille={32} />}
      className="lg:hidden"
    >
      {(fermer) => (
        <>
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
        </>
      )}
    </MenuPleinEcran>
  );
}
