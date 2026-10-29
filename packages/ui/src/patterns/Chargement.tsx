import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';
import { Chargeur } from '../primitives/Chargeur';

/**
 * Apparition différée (masqué 150 ms, puis visible d'un coup) : rien ne clignote quand la réponse
 * arrive vite, et jamais de texte à moitié transparent (contraste AA).
 */
const APPARITION = 'animate-[apparaitre-apres_.15s_step-end_both]';

const VOILES = {
  leger: 'bg-blanc/65 backdrop-blur-[1.5px]',
  opaque: 'bg-blanc',
  aucun: '',
} as const;

export interface ZoneChargementProps extends ComponentProps<'div'> {
  chargement: boolean;
  /** Ce qui se passe (« Enregistrement… ») ; sinon seulement l'icône. */
  message?: string;
  /** `leger` : contenu visible en transparence ; `opaque` : masqué ; `aucun` : sans voile. */
  voile?: keyof typeof VOILES;
  children: ReactNode;
}

/**
 * Chargement d'un composant précis (carte, liste, panneau) : voile et chargeur par-dessus, le
 * contenu reste en place (pas de saut) et inerte le temps du chargement.
 */
export function ZoneChargement({
  chargement,
  message,
  voile = 'leger',
  children,
  className,
  ...rest
}: ZoneChargementProps) {
  return (
    <div
      className={cn('relative', className)}
      {...(chargement ? { 'aria-busy': true } : {})}
      {...rest}
    >
      <div className="contents" inert={chargement}>
        {children}
      </div>
      {chargement ? (
        <div
          className={cn(
            'absolute inset-0 z-10 grid place-items-center rounded-[inherit] p-4',
            VOILES[voile],
            APPARITION,
          )}
        >
          <Chargeur taille="md" {...(message ? { message } : {})} className="flex-col" />
        </div>
      ) : null}
    </div>
  );
}

export interface ChargementPageProps {
  message?: string;
  /** Par-dessus tout l'écran (changement d'espace, paiement) ; sinon dans la zone de contenu. */
  pleinEcran?: boolean;
  /** Fond légèrement transparent : la page reste devinée derrière (plein écran seulement). */
  transparent?: boolean;
  className?: string;
}

/** Chargement d'une page entière (`loading.tsx`) ou d'une action qui bloque tout l'écran. */
export function ChargementPage({
  message = 'Chargement…',
  pleinEcran = false,
  transparent = false,
  className,
}: ChargementPageProps) {
  return (
    <div
      role="status"
      className={cn(
        'grid place-items-center content-center gap-4 px-page py-16 text-center',
        pleinEcran
          ? cn('fixed inset-0 z-50', transparent ? 'bg-blanc/80 backdrop-blur-sm' : 'bg-blanc')
          : 'min-h-[50dvh]',
        APPARITION,
        className,
      )}
    >
      <Chargeur taille="xl" decoratif />
      <p className="m-0 text-[15px] font-semibold text-neutre-700">{message}</p>
    </div>
  );
}
