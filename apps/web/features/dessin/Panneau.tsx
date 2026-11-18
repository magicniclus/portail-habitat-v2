'use client';

import { CaretDoubleLeftIcon, CaretDoubleRightIcon } from '@phosphor-icons/react';
import { IconButton } from '@ph/ui';
import type { ReactNode } from 'react';

/**
 * Panneau repliable à côté d'un rail. Sur ordinateur il pousse le plan ; sur téléphone il
 * passe par-dessus le plan, contre son rail.
 */
export function Panneau({
  cote,
  titre,
  replier,
  children,
}: {
  cote: 'gauche' | 'droite';
  titre: string;
  replier: () => void;
  children: ReactNode;
}) {
  const gauche = cote === 'gauche';
  return (
    <section
      aria-label={titre}
      className={`flex w-[300px] flex-none flex-col bg-blanc max-[899px]:absolute max-[899px]:inset-y-0 max-[899px]:z-20 max-[899px]:w-[min(320px,calc(100vw-150px))] max-[899px]:shadow-lg ${gauche ? 'border-r border-trait max-[899px]:left-[76px]' : 'border-l border-trait max-[899px]:right-[60px]'}`}
    >
      <header className="flex min-h-14 flex-none items-center gap-2 border-b border-trait pr-1.5 pl-4">
        <h2 className="m-0 flex-1 text-[17px] font-bold">{titre}</h2>
        <IconButton
          aria-label={`Replier ${titre.toLowerCase()}`}
          icone={gauche ? <CaretDoubleLeftIcon /> : <CaretDoubleRightIcon />}
          onClick={replier}
        />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
  );
}
