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
}

/**
 * Panneau plein écran contrôlé (Radix Dialog : focus piégé, Échap, retour du focus sur l'élément
 * qui l'a ouvert). Sans déclencheur : il peut être chargé à la demande, à la première ouverture.
 */
export function PanneauPleinEcran({
  titre,
  entete,
  ouvert,
  onOuvertChange,
  children,
  retourFocus,
}: PanneauPleinEcranProps) {
  return (
    <Dialog.Root open={ouvert} onOpenChange={onOuvertChange}>
      <Dialog.Portal>
        <Dialog.Content
          className={cn(
            'fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-fond text-texte',
            'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
            'motion-safe:animate-[fondu_150ms_ease-out]',
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
