'use client';

import type { LienPro } from '@ph/core/espace-pro';
import { IconButton } from '@ph/ui';
import { SidebarSimpleIcon } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { estActif } from './liens';
import { NavMobilePro } from './NavMobilePro';
import { SelecteurEntreprise } from './SelecteurEntreprise';
import { SidebarPro } from './SidebarPro';

export interface CadreProProps {
  menu: { titre: string; liens: LienPro[] }[];
  entreprises: { artisanId: string; nomCommercial: string }[];
  activeId: string | null;
  /** Pastille d'état de la fiche (« Fiche en ligne · Mérignac · 30 km »). */
  etatFiche: ReactNode;
  initiales: string;
  encart: ReactNode;
  children: ReactNode;
}

/** Cadre de l'espace pro : barre latérale (ordinateur), en-tête, onglets du bas (mobile). */
export function CadrePro(p: CadreProProps) {
  const [ouvert, setOuvert] = useState(true);
  const chemin = usePathname();
  const titre =
    p.menu.flatMap((s) => s.liens).find((l) => estActif(chemin, l.cle))?.libelle ?? 'Espace pro';
  const selecteur =
    p.entreprises.length > 1 ? (
      <SelecteurEntreprise entreprises={p.entreprises} activeId={p.activeId} />
    ) : null;
  return (
    <div className="min-h-dvh bg-blanc text-texte lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <SidebarPro menu={p.menu} ouvert={ouvert} selecteur={selecteur} encart={p.encart} />
      <div className="flex min-w-0 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)] py-2.5">
          <IconButton
            variant="secondaire"
            aria-label={ouvert ? 'Replier le menu' : 'Déplier le menu'}
            aria-controls="menu-pro"
            aria-expanded={ouvert}
            onClick={() => setOuvert((o) => !o)}
            className="hidden lg:inline-flex"
            icone={<SidebarSimpleIcon className={ouvert ? '' : 'rotate-180'} />}
          />
          <p className="m-0 truncate text-[17px] font-bold">{titre}</p>
          <div className="ml-auto flex min-w-0 items-center gap-2.5">
            {p.etatFiche}
            <span
              aria-hidden="true"
              className="flex size-10 flex-none items-center justify-center rounded-full bg-accent-200 text-sm font-bold text-accent-800"
            >
              {p.initiales}
            </span>
          </div>
        </header>
        {p.children}
      </div>
      <NavMobilePro menu={p.menu} selecteur={selecteur} />
    </div>
  );
}
