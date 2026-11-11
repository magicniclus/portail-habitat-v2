import { cn, Logo } from '@ph/ui';
import { LienGererCookies } from '@/features/cookies/BandeauCookies';
import Link from 'next/link';
import type { LienNav } from './EnTetePublic';

export interface ColonnePied {
  titre: string;
  liens: LienNav[];
}

/**
 * Pied de page public : marque et accroche à gauche, colonnes de liens titrées, barre du bas
 * (copyright à gauche, cookies à droite). `clair` (pages pro : landing, acquisition) :
 * fond blanc dans la continuité des pages ; sinon fond accent-900 (pages particuliers).
 */
export function PiedPublic({
  accroche,
  colonnes,
  variantLogo = 'particulier',
  mention,
  clair = false,
}: {
  accroche: string;
  /** Complément de la ligne de copyright (« Prix indicatifs… »). */
  mention?: string;
  colonnes: ColonnePied[];
  variantLogo?: 'particulier' | 'pro' | 'diag';
  /** Fond blanc, filet en haut (pages pro). */
  clair?: boolean;
}) {
  const lien = clair ? 'text-neutre-800 hover:text-accent-700' : 'text-accent-200 hover:text-blanc';
  const lienBas = cn(
    'min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[13px] underline underline-offset-2',
    lien,
  );
  return (
    <footer
      className={cn(
        'pb-[env(safe-area-inset-bottom)]',
        clair ? 'border-t border-trait bg-blanc text-neutre-800' : 'bg-accent-900 text-accent-200',
      )}
    >
      <div className="mx-auto grid max-w-[1280px] gap-x-12 gap-y-8 px-[clamp(18px,4vw,44px)] pt-[clamp(40px,5vw,64px)] pb-[clamp(28px,4vw,44px)] md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="grid content-start gap-3.5 md:pr-6">
          <Logo variant={variantLogo} inverse={!clair} taille={34} />
          <p className="m-0 max-w-[34ch] text-[15px] leading-[23px]">{accroche}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:col-span-3">
          {colonnes.map((c) => (
            <nav key={c.titre} aria-label={c.titre} className="min-w-0">
              <p
                className={cn(
                  'm-0 mb-1.5 text-xs font-bold tracking-[0.08em] uppercase',
                  clair ? 'text-texte' : 'text-blanc',
                )}
              >
                {c.titre}
              </p>
              <ul className="m-0 list-none p-0">
                {c.liens.map((l) => (
                  <li key={l.libelle}>
                    <Link
                      href={l.href}
                      prefetch={l.prefetch}
                      className={cn(
                        'inline-flex min-h-11 min-w-11 items-center text-[14.5px] no-underline transition-colors',
                        lien,
                      )}
                    >
                      {l.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className={cn('border-t', clair ? 'border-trait' : 'border-blanc/12')}>
        <p className="m-0 mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-[clamp(18px,4vw,44px)] py-2 text-[13px]">
          <span className="py-3">
            © {new Date().getFullYear()} Portail Travaux{variantLogo === 'diag' ? ' Diag' : ''}.{' '}
            {mention ?? 'Tous droits réservés.'}
          </span>
          <span className="flex flex-wrap items-center gap-x-5">
            <LienGererCookies className={lienBas} />
          </span>
        </p>
      </div>
    </footer>
  );
}
