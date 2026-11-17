import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';
import { couleursGoogle as g } from '../tokens';
import { Chargeur } from './Chargeur';

/** Logo « G » de Google en couleurs (règles d'usage de la marque : jamais recoloré). */
export function LogoGoogle({ taille = 20 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill={g.rouge}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill={g.bleu}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill={g.jaune}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill={g.vert}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Bouton « Continuer avec Google » au format habituel (fond blanc, bordure grise, logo en
 * couleurs, texte foncé), quel que soit le thème : c'est ce que les gens reconnaissent.
 */
export function BoutonGoogle({
  chargement = false,
  className,
  children = 'Continuer avec Google',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { chargement?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || chargement}
      {...(chargement ? { 'aria-busy': true } : {})}
      className={cn(
        'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-neutre-300 bg-blanc px-4 text-[15px] font-semibold text-neutre-900 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-colors hover:border-neutre-400 hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-action disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {chargement ? <Chargeur taille="sm" ton="courant" decoratif /> : <LogoGoogle />}
      {children}
    </button>
  );
}
