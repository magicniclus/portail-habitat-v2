import { bouton, Logo } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { MenuPublic } from './MenuPublic';

export interface LienNav {
  libelle: string;
  href: Route;
}

export interface EnTetePublicProps {
  /** Bandeau du haut (« Devis gratuits et sans engagement… ») ; absent si vide. */
  bandeau?: string;
  accueil: Route;
  variantLogo?: 'particulier' | 'pro' | 'diag';
  liens: LienNav[];
  secondaire?: LienNav;
  principal: LienNav;
  /** Libellé court du bouton principal sous 640 px (en-tête de 56 px). */
  principalCourt?: string;
}

/**
 * En-tête des pages publiques (maquettes Accueil, Acquisition, Diagnostic) : collant, 56 px sur mobile
 * avec logo + bouton principal + menu plein écran (MOBILE §6, ACC-04), navigation complète dès 1024 px.
 */
export function EnTetePublic({
  bandeau,
  accueil,
  variantLogo = 'particulier',
  liens,
  secondaire,
  principal,
  principalCourt,
}: EnTetePublicProps) {
  const logo = (
    <Link href={accueil} className="flex min-h-11 min-w-11 items-center text-texte no-underline">
      <Logo
        variant={variantLogo}
        taille={32}
        className="max-[389px]:[&>span:last-child]:sr-only sm:[&_svg]:size-9"
      />
    </Link>
  );
  return (
    <>
      {bandeau ? (
        <p className="m-0 bg-accent-900 px-5 py-[9px] text-center text-[13.5px] leading-5 text-blanc">
          {bandeau}
        </p>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-trait bg-fond pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-14 max-w-[1280px] items-center gap-x-3 gap-y-3 px-[clamp(16px,4vw,44px)] lg:gap-x-7 py-1.5 lg:py-3.5">
          {logo}
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-x-[22px] text-[15px] lg:flex"
          >
            {liens.map((l) => (
              <Link
                key={l.libelle}
                href={l.href}
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-texte no-underline hover:text-accent"
              >
                {l.libelle}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:gap-3.5">
            {secondaire ? (
              <Link
                href={secondaire.href}
                className="hidden min-h-11 items-center text-[14.5px] text-neutre-800 no-underline hover:text-accent lg:inline-flex"
              >
                {secondaire.libelle}
              </Link>
            ) : null}
            <Link
              href={principal.href}
              className={bouton({ className: 'min-h-11 px-3.5 text-[15px] sm:px-[18px]' })}
            >
              {principalCourt ? (
                <>
                  <span className="sm:hidden">{principalCourt}</span>
                  <span className="hidden sm:inline">{principal.libelle}</span>
                </>
              ) : (
                principal.libelle
              )}
            </Link>
            <MenuPublic
              liens={[...liens, ...(secondaire ? [secondaire] : [])]}
              principal={principal}
              variantLogo={variantLogo}
            />
          </div>
        </div>
      </header>
    </>
  );
}
