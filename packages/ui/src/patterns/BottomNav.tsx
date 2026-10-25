import { Slot } from 'radix-ui';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { cn } from '../cn';

/** Barre d'onglets en bas (espace pro, espace particulier) : 5 entrées au plus (MOBILE.md §6). */
export function BottomNav({ className, children, ...rest }: ComponentProps<'nav'>) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-trait bg-blanc pb-[env(safe-area-inset-bottom)] lg:hidden',
        className,
      )}
      {...rest}
    >
      <ul className="m-0 grid list-none auto-cols-fr grid-flow-col p-0">{children}</ul>
    </nav>
  );
}

export interface BottomNavItemProps {
  icone: ReactNode;
  libelle: string;
  actif?: boolean;
  /** Nombre affiché en pastille (0 ou absent : rien). */
  badge?: number;
  /** Pastille incitative sans nombre (point orange) ; le texte est lu par les lecteurs d'écran. */
  alerte?: string;
  /** Lien vide (souvent `<Link href="…" />`) : il reçoit l'icône, le libellé et le style. */
  children: ReactElement;
}

export function BottomNavItem({
  icone,
  libelle,
  actif,
  badge,
  alerte,
  children,
}: BottomNavItemProps) {
  return (
    <li>
      <Slot.Root
        aria-current={actif ? 'page' : undefined}
        className={cn(
          'relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold no-underline',
          actif ? 'text-accent-700' : 'text-neutre-700 hover:text-texte',
        )}
      >
        <Slot.Slottable>{children}</Slot.Slottable>
        <span aria-hidden="true" className="text-[24px] leading-none">
          {icone}
        </span>
        <span>{libelle}</span>
        {badge ? (
          <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-5 rounded-pill bg-accent-action px-1.5 text-[11px] leading-5 text-blanc">
            {badge}
            <span className="sr-only"> nouveaux</span>
          </span>
        ) : alerte ? (
          <span className="absolute top-2 left-[calc(50%+8px)] size-2.5 rounded-full border-2 border-blanc bg-accent-action">
            <span className="sr-only"> · {alerte}</span>
          </span>
        ) : null}
      </Slot.Root>
    </li>
  );
}
