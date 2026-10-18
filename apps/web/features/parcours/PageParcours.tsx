import { Logo, type LogoProps } from '@ph/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { routes } from '@/lib/routes';

const CONTENEUR_PARCOURS = 'mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,44px)]';

/**
 * Gabarit des parcours (simulateur, diagnostic, avis) : en-tête sobre sans menu, pour ne pas
 * détourner du parcours, puis le contenu sur fond clair.
 */
export function PageParcours({
  titre,
  accueil = routes.accueil,
  logo,
  aide = routes.aide,
  mention,
  children,
}: {
  titre: string;
  accueil?: string;
  logo?: LogoProps['variant'];
  aide?: string;
  /** Texte court à droite (« Gratuit · sans engagement »), masqué sur mobile. */
  mention?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-trait bg-blanc">
        <div
          className={`${CONTENEUR_PARCOURS} flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 py-2`}
        >
          <Link href={accueil} className="flex min-h-11 items-center text-texte no-underline">
            <Logo taille={32} {...(logo ? { variant: logo } : {})} />
          </Link>
          <span className="hidden text-[15px] text-neutre-800 sm:inline">{titre}</span>
          <span className="ml-auto flex items-center gap-3.5 text-sm text-neutre-800">
            {mention ? (
              <span className="hidden items-center gap-2 sm:flex">
                <span aria-hidden="true" className="block size-[7px] rounded-pill bg-accent" />
                {mention}
              </span>
            ) : null}
            <Link href={aide} className="inline-flex min-h-11 items-center text-neutre-800">
              Besoin d&apos;aide ?
            </Link>
          </span>
        </div>
      </header>
      <main className="flex-1 bg-accent-100 py-[clamp(24px,3.5vw,48px)] pb-[clamp(40px,5vw,72px)]">
        <div className={CONTENEUR_PARCOURS}>{children}</div>
      </main>
    </div>
  );
}
