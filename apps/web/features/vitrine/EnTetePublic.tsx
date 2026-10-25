import { bouton, cn, Logo } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { MenuPublic } from './MenuPublic';

export interface LienNav {
  libelle: string;
  href: Route;
  /** `false` pour une page lourde (simulateur) : pas de préchargement depuis la vitrine (budget D46). */
  prefetch?: false;
  /** Lien affiché seulement dans le menu mobile (maquette Acquisition : barre réduite). */
  menuSeul?: true;
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
  /** Maquette Acquisition : bandeau orange, liens poussés à droite, « Espace pro » en bouton. */
  acquisition?: boolean;
}

function IconeCompte() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
    </svg>
  );
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
  acquisition = false,
}: EnTetePublicProps) {
  const logo = (
    <Link href={accueil} className="flex min-h-11 min-w-11 items-center text-texte no-underline">
      <Logo
        variant={variantLogo}
        taille={acquisition ? 40 : 32}
        empile={acquisition}
        className={cn(
          // Texte du logo masqué (lu par les lecteurs d'écran) quand l'en-tête manque de place.
          variantLogo === 'particulier'
            ? 'max-[389px]:[&>span:last-child]:sr-only'
            : 'max-[479px]:[&>span:last-child]:sr-only',
          !acquisition && 'sm:[&_svg]:size-9',
        )}
      />
    </Link>
  );
  return (
    <>
      {bandeau ? (
        <p
          className={cn(
            'm-0 px-5 text-center leading-5 text-blanc',
            acquisition
              ? 'bg-accent-action py-2.5 text-sm'
              : 'bg-accent-900 py-[9px] text-[13.5px]',
          )}
        >
          {bandeau}
        </p>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-trait bg-fond pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-14 max-w-[1280px] items-center gap-x-3 gap-y-3 px-[clamp(16px,4vw,44px)] lg:gap-x-7 py-1.5 lg:py-3.5">
          {logo}
          <nav
            aria-label="Navigation principale"
            className={cn(
              'hidden items-center gap-x-[22px] text-[15px] lg:flex',
              acquisition && 'ml-auto',
            )}
          >
            {liens
              .filter((l) => !l.menuSeul)
              .map((l) => (
                <Link
                  key={l.libelle}
                  href={l.href}
                  prefetch={l.prefetch}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-texte no-underline hover:text-accent"
                >
                  {l.libelle}
                </Link>
              ))}
          </nav>
          <div
            className={cn(
              'flex items-center gap-2 lg:gap-3.5',
              acquisition ? 'max-lg:ml-auto' : 'ml-auto',
            )}
          >
            {secondaire ? (
              // Enveloppe : la classe `hidden` doit primer sur l'`inline-flex` du bouton.
              <span className="hidden lg:contents">
                <Link
                  href={secondaire.href}
                  prefetch={secondaire.prefetch}
                  className={
                    acquisition
                      ? bouton({
                          variant: 'secondaire',
                          className: 'hidden min-h-11 gap-2 text-[15px] lg:inline-flex',
                        })
                      : 'hidden min-h-11 items-center text-[14.5px] text-neutre-800 no-underline hover:text-accent lg:inline-flex'
                  }
                >
                  {acquisition ? <IconeCompte /> : null}
                  {secondaire.libelle}
                </Link>
              </span>
            ) : null}
            <Link
              href={principal.href}
              prefetch={principal.prefetch}
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
              liens={liens}
              principal={principal}
              secondaire={secondaire}
              variantLogo={variantLogo}
            />
          </div>
        </div>
      </header>
    </>
  );
}
