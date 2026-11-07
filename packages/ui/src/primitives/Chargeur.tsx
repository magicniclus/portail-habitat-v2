import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../cn';

const PX = { xs: 14, sm: 18, md: 36, lg: 52, xl: 72 } as const;

const variantesChargeur = cva('inline-flex flex-none items-center gap-2 align-middle', {
  variants: {
    /** `courant` : couleur du texte (dans un bouton) ; `inverse` : sur fond foncé. */
    ton: { accent: 'text-accent', courant: '', inverse: 'text-blanc' },
  },
  defaultVariants: { ton: 'accent' },
});

export interface ChargeurProps
  extends Omit<ComponentProps<'span'>, 'children'>, VariantProps<typeof variantesChargeur> {
  taille?: keyof typeof PX;
  /** `maison` : le logo qui se dessine ; `anneau` : petit cercle (boutons, champs). */
  forme?: 'maison' | 'anneau';
  /** Texte affiché à côté ; sinon lu seulement par les lecteurs d'écran. */
  message?: string;
  /** Lu par les lecteurs d'écran quand il n'y a pas de message. */
  libelle?: string;
  /** Dans un élément déjà annoncé (`aria-busy`) : purement visuel. */
  decoratif?: boolean;
}

/**
 * Chargeur Portail Travaux : la maison du logo dont le toit se dessine en boucle (porte qui
 * s'allume), ou un anneau aux petites tailles. Couleurs du thème (`data-theme`), immobile avec
 * `prefers-reduced-motion`.
 */
export function Chargeur({
  taille = 'md',
  forme = taille === 'xs' || taille === 'sm' ? 'anneau' : 'maison',
  ton,
  message,
  libelle = 'Chargement…',
  decoratif = false,
  className,
  ...rest
}: ChargeurProps) {
  const px = PX[taille];
  const inverse = ton === 'inverse';
  const icone =
    forme === 'anneau' ? (
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="flex-none motion-safe:animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity=".22"
          strokeWidth="3"
        />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    ) : (
      <svg width={px} height={px} viewBox="0 0 40 40" aria-hidden="true" className="flex-none">
        {/* Maison du logo en filigrane, puis le toit qui se trace en couleur. */}
        <g
          fill="none"
          stroke={inverse ? 'currentColor' : 'var(--color-neutre-300)'}
          strokeOpacity={inverse ? 0.35 : 1}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 19.5 20 7l15 12.5" />
          <path d="M9 21.5V33h22V21.5" />
        </g>
        <path
          d="M5 19.5 20 7l15 12.5"
          fill="none"
          stroke={inverse ? 'var(--accent-400)' : 'currentColor'}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          className="motion-safe:animate-[chargeur-toit_1.6s_cubic-bezier(.65,0,.35,1)_infinite]"
        />
        <rect
          x="17"
          y="25"
          width="6"
          height="8"
          rx="1"
          fill={inverse ? 'var(--accent-400)' : 'currentColor'}
          className="motion-safe:animate-[chargeur-porte_1.6s_ease-in-out_infinite]"
        />
      </svg>
    );
  return (
    <span
      {...(decoratif ? { 'aria-hidden': true } : { role: 'status' })}
      className={cn(variantesChargeur({ ton }), className)}
      {...rest}
    >
      {icone}
      {message ? (
        <span className="text-[15px] font-semibold text-neutre-700">{message}</span>
      ) : decoratif ? null : (
        <span className="sr-only">{libelle}</span>
      )}
    </span>
  );
}
