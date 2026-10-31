'use client';

import { XIcon } from '@phosphor-icons/react/ssr';
import { Dialog } from 'radix-ui';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../cn';
import { IconButton } from '../primitives/IconButton';

export interface FeuilleProps {
  open?: boolean;
  onOpenChange?: (ouvert: boolean) => void;
  /** Élément qui ouvre la fenêtre (Radix `asChild`). */
  declencheur?: ReactNode;
  titre: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Boutons du bas (collés en bas sur mobile). */
  actions?: ReactNode;
  /** `adaptatif` : feuille du bas sous 640 px, fenêtre centrée au-dessus. `bas` : toujours une feuille. */
  mode?: 'adaptatif' | 'bas';
  className?: string;
}

const SEUIL_FERMETURE = 90;

/**
 * Fenêtre modale unique (Radix Dialog : focus piégé, Échap, retour du focus).
 * Sous 640 px, elle devient une feuille du bas fermable par balayage vers le bas (MOB-05).
 */
export function Feuille({
  open,
  onOpenChange,
  declencheur,
  titre,
  description,
  children,
  actions,
  mode = 'adaptatif',
  className,
}: FeuilleProps) {
  const contenu = useRef<HTMLDivElement>(null);
  const depart = useRef<number | null>(null);

  const glisser = {
    onPointerDown: (e: PointerEvent) => {
      depart.current = e.clientY;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      if (depart.current === null || !contenu.current) return;
      const dy = Math.max(0, e.clientY - depart.current);
      contenu.current.style.transform = `translateY(${dy}px)`;
    },
    onPointerUp: (e: PointerEvent) => {
      if (depart.current === null || !contenu.current) return;
      const dy = e.clientY - depart.current;
      depart.current = null;
      contenu.current.style.transform = '';
      if (dy > SEUIL_FERMETURE) onOpenChange?.(false);
    },
  };

  const adaptatif = mode === 'adaptatif';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {declencheur && <Dialog.Trigger asChild>{declencheur}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-texte/45 motion-safe:animate-[fondu_150ms_ease-out]" />
        <Dialog.Content
          ref={contenu}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 flex max-h-[92dvh] flex-col bg-blanc shadow-lg outline-none',
            'inset-x-0 bottom-0 rounded-t-panel overscroll-contain motion-safe:animate-[monter_200ms_ease-out]',
            adaptatif &&
              'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(560px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel sm:motion-safe:animate-[fondu_150ms_ease-out]',
            className,
          )}
        >
          <div
            {...glisser}
            className={cn(
              'flex cursor-grab touch-none justify-center pt-2.5 pb-1',
              adaptatif && 'sm:hidden',
            )}
            aria-hidden="true"
          >
            <span className="h-1.5 w-10 rounded-pill bg-neutre-300" />
          </div>
          <div className="flex items-start gap-3 px-5 pt-2 sm:pt-5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Dialog.Title className="m-0 text-xl leading-tight font-bold">{titre}</Dialog.Title>
              {description && (
                <Dialog.Description className="m-0 text-neutre-800">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton aria-label="Fermer" icone={<XIcon />} className="-mt-1.5 -mr-2" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {actions && (
            <div className="flex flex-col-reverse gap-2 border-t border-trait px-5 pt-3 pb-sure sm:flex-row sm:justify-end sm:pb-4">
              {actions}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Raccourcis de lecture : `<Modal>` (adaptative) et `<Sheet>` (toujours en bas : filtres, sélecteurs). */
export function Modal(props: Omit<FeuilleProps, 'mode'>) {
  return <Feuille {...props} mode="adaptatif" />;
}

export function Sheet(props: Omit<FeuilleProps, 'mode'>) {
  return <Feuille {...props} mode="bas" />;
}

/** Ferme la fenêtre englobante (à mettre autour d'un bouton « Annuler »). */
export const FermerFeuille = Dialog.Close;
