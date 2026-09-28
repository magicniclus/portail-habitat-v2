'use client';

import { ListIcon, XIcon } from '@phosphor-icons/react/ssr';
import { Dialog } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { IconButton } from '../primitives/IconButton';

export interface MenuPleinEcranProps {
  /** Nom du menu pour les lecteurs d'écran (« Menu principal »). */
  titre: string;
  /** En-tête du panneau, en général le logo. */
  entete?: ReactNode;
  /**
   * Liens du menu. Reçoit `fermer` : à appeler au clic d'un lien interne
   * (la navigation côté client ne démonte pas le menu).
   */
  children: (fermer: () => void) => ReactNode;
  className?: string;
}

/**
 * Menu mobile du site public (MOBILE.md §6) : bouton de 44 px avec `aria-expanded`,
 * panneau plein écran Radix (focus piégé, Échap, retour du focus), zones sûres respectées.
 */
export function MenuPleinEcran({ titre, entete, children, className }: MenuPleinEcranProps) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);
  return (
    <Dialog.Root open={ouvert} onOpenChange={setOuvert}>
      <Dialog.Trigger asChild>
        <IconButton
          aria-label={titre}
          aria-expanded={ouvert}
          icone={<ListIcon weight="bold" />}
          className={className}
        />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          className={cn(
            'fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-fond text-texte',
            'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
            'motion-safe:animate-[fondu_150ms_ease-out]',
          )}
          aria-describedby={undefined}
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-trait px-page">
            {entete}
            <Dialog.Title className="sr-only">{titre}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton aria-label="Fermer le menu" icone={<XIcon weight="bold" />} />
            </Dialog.Close>
          </div>
          <nav aria-label={titre} className="flex flex-col gap-1 px-page py-4">
            {children(fermer)}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
