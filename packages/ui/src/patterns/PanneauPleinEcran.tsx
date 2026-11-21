'use client';

import { XIcon } from '@phosphor-icons/react/ssr';
import { Dialog } from 'radix-ui';
import type { ReactNode, RefObject } from 'react';
import { cn } from '../cn';
import { IconButton } from '../primitives/IconButton';

export interface PanneauPleinEcranProps {
  titre: string;
  entete?: ReactNode;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  children: ReactNode;
  /** Élément qui reprend le focus à la fermeture (le bouton d'ouverture). */
  retourFocus?: RefObject<HTMLElement | null>;
  /** Boutons placés en bas du panneau. */
  pied?: ReactNode;
}

/**
 * Menu mobile en tiroir : glisse depuis la droite sur un voile assombri (maquettes). Contrôlé (Radix Dialog : focus piégé, Échap, retour du focus sur l'élément
 * qui l'a ouvert). Sans déclencheur : il peut être chargé à la demande, à la première ouverture.
 */
export function PanneauPleinEcran({
  titre,
  entete,
  ouvert,
  onOuvertChange,
  children,
  retourFocus,
  pied,
}: PanneauPleinEcranProps) {
  return (
    <Dialog.Root open={ouvert} onOpenChange={onOuvertChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-texte/40 motion-safe:data-[state=closed]:animate-[disparaitre_250ms_ease-in_forwards] motion-safe:data-[state=open]:animate-[fondu_250ms_ease-out]" />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex flex-col overflow-y-auto overscroll-contain bg-fond text-texte',
            'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
            'inset-y-0 right-0 w-[min(86vw,360px)] shadow-lg',
            'motion-safe:data-[state=open]:animate-[entrer-droite_300ms_cubic-bezier(0.2,0.8,0.2,1)]',
            'motion-safe:data-[state=closed]:animate-[sortir-droite_300ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]',
          )}
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            if (!retourFocus?.current) return;
            e.preventDefault();
            retourFocus.current.focus();
          }}
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-trait px-page">
            {entete}
            <Dialog.Title className="sr-only">{titre}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton aria-label="Fermer le menu" icone={<XIcon weight="bold" />} />
            </Dialog.Close>
          </div>
          <nav aria-label={titre} className="flex flex-col gap-1 px-page py-4">
            {children}
          </nav>
          {pied ? (
            <div className="mt-auto flex flex-col gap-2.5 px-page pt-2 pb-6">{pied}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
