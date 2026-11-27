import { cva } from 'class-variance-authority';

/** Classes des boutons, sans dépendance à Radix : utilisable sur un lien ou dans un composant léger. */
const variantesBouton = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-control border font-semibold no-underline',
    'min-h-11 cursor-pointer transition-colors duration-150 select-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primaire:
          'border-accent-action bg-accent-action text-blanc hover:bg-accent-700 hover:border-accent-700 hover:text-blanc active:bg-accent-800',
        secondaire:
          'border-neutre-400 bg-blanc text-texte hover:bg-neutre-100 hover:text-texte active:bg-neutre-200',
        fantome:
          'border-transparent bg-transparent text-accent-700 hover:bg-accent-100 hover:text-accent-800 active:bg-accent-200',
        danger: 'border-danger bg-danger text-blanc hover:opacity-90 hover:text-blanc',
      },
      taille: {
        sm: 'px-3 text-sm',
        md: 'px-5 text-base',
        lg: 'min-h-12 px-6 text-[17px]',
      },
      pleineLargeur: { true: 'w-full' },
      /** Retour à la ligne : une seule classe `whitespace-*` à la fois, sans fusion coûteuse. */
      ligne: { unique: 'whitespace-nowrap', multiple: 'whitespace-normal' },
    },
    defaultVariants: { variant: 'primaire', taille: 'md' },
  },
);

/**
 * Classes des boutons. Pas de tailwind-merge ici (coût d'exécution dans le navigateur, D46) : les variantes
 * ne se contredisent pas ; un bouton pleine largeur passe à la ligne par défaut (`ligne: 'multiple'`).
 */
export function bouton(options: Parameters<typeof variantesBouton>[0] = {}): string {
  return variantesBouton({
    ...options,
    ligne: options.ligne ?? (options.pleineLargeur ? 'multiple' : 'unique'),
  });
}
