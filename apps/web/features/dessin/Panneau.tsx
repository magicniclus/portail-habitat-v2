'use client';

import { CaretDoubleLeftIcon, CaretDoubleRightIcon } from '@phosphor-icons/react';
import { IconButton } from '@ph/ui';
import type { ReactNode } from 'react';

/**
 * Panneau repliable à côté d'un rail. Sur ordinateur il pousse le plan ; sur téléphone c'est
 * une feuille du bas (DES-46, MOBILE.md) entre les deux rails, qui restent accessibles ; le haut
 * du plan reste visible.
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
      className={`flex w-[300px] flex-none flex-col bg-blanc max-[899px]:absolute max-[899px]:right-[60px] max-[899px]:bottom-0 max-[899px]:left-[76px] max-[899px]:z-20 max-[899px]:max-h-[60dvh] max-[899px]:w-auto max-[899px]:rounded-t-2xl max-[899px]:border-t max-[899px]:border-trait max-[899px]:shadow-[0_-8px_24px_rgb(0_0_0/0.12)] ${gauche ? 'border-r border-trait' : 'border-l border-trait'}`}
    >
      {/* Poignée de la feuille du bas (téléphone). */}
      <span
        aria-hidden="true"
        className="mx-auto mt-2 hidden h-1.5 w-10 flex-none rounded-full bg-neutre-300 max-[899px]:block"
      />
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
