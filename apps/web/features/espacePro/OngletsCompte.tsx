'use client';

import type { LienPro } from '@ph/core/espace-pro';
import { cn } from '@ph/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { estActif, LIENS_PRO } from './liens';

/**
 * Onglets de Mon compte (maquettes Mon Compte, Equipe, Mon Abonnement, Aide et Contact ; NAV-01) :
 * identiques sur les quatre pages, selon le rôle.
 */
export function OngletsCompte({ onglets }: { onglets: LienPro[] }) {
  const chemin = usePathname();
  return (
    <nav
      aria-label="Mon compte"
      className="flex gap-2 overflow-x-auto border-b border-trait px-[clamp(16px,3vw,32px)] pt-3"
    >
      {onglets.map((o) => {
        const actif = estActif(chemin, o.cle);
        return (
          <Link
            key={o.cle}
            href={LIENS_PRO[o.cle].href}
            aria-current={actif ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center border-b-2 px-3 font-semibold whitespace-nowrap no-underline',
              actif ? 'border-accent-action text-accent-800' : 'border-transparent text-neutre-800',
            )}
          >
            {o.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
