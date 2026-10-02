import type { ComponentProps } from 'react';
import { cn } from '../cn';
import { suffixesLogo, type Theme } from '../tokens';

export interface LogoProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Espace représenté : impose sa propre couleur, quel que soit le thème de la page. */
  variant?: Theme;
  /** Version sur fond foncé (pied de page) : corps blanc, accent clair. */
  inverse?: boolean;
  /** Masque le texte (le nom reste lisible par les lecteurs d'écran). */
  iconeSeule?: boolean;
  taille?: number;
}

/** Maison en trait (README « Logos ») ; la variante diag remplace la porte par une loupe. */
export function Logo({
  variant = 'particulier',
  inverse = false,
  iconeSeule = false,
  taille = 34,
  className,
  ...rest
}: LogoProps) {
  const accent = inverse ? 'var(--accent-400)' : 'var(--accent)';
  const corps = inverse ? 'var(--color-blanc)' : 'currentColor';
  const suffixe = suffixesLogo[variant];
  return (
    <span
      data-theme={variant}
      data-logo
      className={cn(
        'inline-flex items-center gap-2.5',
        inverse ? 'text-blanc' : 'text-texte',
        className,
      )}
      {...rest}
    >
      <svg
        width={taille}
        height={taille}
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="flex-none"
      >
        <path
          d="M5 19.5 20 7l15 12.5"
          fill="none"
          stroke={accent}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 21.5V33h22V21.5"
          fill="none"
          stroke={corps}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {variant === 'diag' ? (
          <>
            <circle cx="20" cy="25.6" r="4.8" fill="none" stroke={accent} strokeWidth="2.6" />
            <path d="m23.5 29.1 2.6 2.6" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : (
          <rect x="17" y="25" width="6" height="8" rx="1" fill={accent} />
        )}
      </svg>
      <span
        className={cn(
          'text-[15.5px] font-bold tracking-[0.04em] whitespace-nowrap',
          iconeSeule && 'sr-only',
        )}
      >
        PORTAIL HABITAT
        {suffixe && (
          <span
            className={cn('ml-[0.3em]', variant === 'diag' && 'tracking-[0.22em]')}
            style={{ color: accent }}
          >
            {suffixe}
          </span>
        )}
      </span>
    </span>
  );
}
