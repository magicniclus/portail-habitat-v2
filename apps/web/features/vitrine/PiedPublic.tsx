import { Logo } from '@ph/ui';
import Link from 'next/link';
import type { LienNav } from './EnTetePublic';

export interface ColonnePied {
  titre: string;
  liens: LienNav[];
}

/** Pied de page public (maquette Accueil) : fond accent-900, colonnes auto-fit 180 px. */
export function PiedPublic({
  accroche,
  colonnes,
  variantLogo = 'particulier',
}: {
  accroche: string;
  colonnes: ColonnePied[];
  variantLogo?: 'particulier' | 'pro' | 'diag';
}) {
  return (
    <footer className="bg-accent-900 text-accent-200 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-12 gap-y-7 px-[clamp(18px,4vw,44px)] pt-12 pb-10 text-sm leading-[25px] sm:leading-[22px]">
        <div>
          <Logo variant={variantLogo} inverse taille={36} className="mb-3" />
          <p className="m-0">{accroche}</p>
        </div>
        {colonnes.map((c) => (
          <nav key={c.titre} aria-label={c.titre}>
            <p className="m-0 mb-2 font-semibold text-blanc">{c.titre}</p>
            <ul className="m-0 list-none p-0">
              {c.liens.map((l) => (
                <li key={l.libelle}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-11 min-w-11 items-center text-accent-200 hover:text-blanc"
                  >
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="m-0 border-t border-blanc/12 px-[clamp(18px,4vw,44px)] py-[18px] text-center text-[13px]">
        © {new Date().getFullYear()} Portail Habitat. Tous droits réservés.
      </p>
    </footer>
  );
}
