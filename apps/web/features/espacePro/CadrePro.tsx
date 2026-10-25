'use client';

import { PAGES_COMPTE, type LienPro } from '@ph/core/espace-pro';
import { IconButton } from '@ph/ui';
import { SidebarSimpleIcon } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApplicationPro } from '@/features/pwa/ApplicationPro';
import { estActif } from './liens';
import { NavMobilePro } from './NavMobilePro';
import { OngletsCompte } from './OngletsCompte';
import { SelecteurEntreprise } from './SelecteurEntreprise';
import { SidebarPro } from './SidebarPro';

export interface CadreProProps {
  menu: { titre: string; liens: LienPro[] }[];
  /** Onglets de Mon compte selon le rôle (NAV-01). */
  ongletsCompte: LienPro[];
  entreprises: { artisanId: string; nomCommercial: string }[];
  activeId: string | null;
  /** Pastille d'état de la fiche (« Fiche en ligne · Mérignac · 30 km »). */
  etatFiche: ReactNode;
  initiales: string;
  /** Encart du bas de la barre latérale (offre contextuelle, PAIEMENTS §4), facultatif. */
  encart?: ReactNode;
  children: ReactNode;
}

/** Cadre de l'espace pro : barre latérale (ordinateur), en-tête, onglets du bas (mobile). */
export function CadrePro(p: CadreProProps) {
  const [ouvert, setOuvert] = useState(true);
  const chemin = usePathname();
  const entete = useEntete();
  const surCompte = PAGES_COMPTE.some((c) => estActif(chemin, c));
  const titre = surCompte
    ? 'Mon compte'
    : (p.menu.flatMap((s) => s.liens).find((l) => estActif(chemin, l.cle))?.libelle ??
      'Espace pro');
  const selecteur =
    p.entreprises.length > 1 ? (
      <SelecteurEntreprise entreprises={p.entreprises} activeId={p.activeId} />
    ) : null;
  return (
    <div className="min-h-dvh bg-blanc text-texte lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <SidebarPro menu={p.menu} ouvert={ouvert} initiales={p.initiales} encart={p.encart} />
      <div className="flex min-w-0 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header
          ref={entete}
          className="sticky top-0 z-20 flex items-center gap-3 border-b border-trait bg-blanc px-[clamp(16px,3vw,32px)] py-2.5"
        >
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
            {/* Sélecteur d'entreprise dans l'en-tête, hors de la barre latérale (D63). */}
            {selecteur ? <div className="hidden lg:block">{selecteur}</div> : null}
            {p.etatFiche}
            <span
              aria-hidden="true"
              className="flex size-10 flex-none items-center justify-center rounded-full bg-accent-200 text-sm font-bold text-accent-800"
            >
              {p.initiales}
            </span>
          </div>
        </header>
        <ApplicationPro />
        {surCompte ? <OngletsCompte onglets={p.ongletsCompte} /> : null}
        {p.children}
      </div>
      <NavMobilePro
        menu={[
          ...p.menu,
          { titre: 'Mon compte', liens: [{ cle: 'compte', libelle: 'Mon compte' }] },
        ]}
        selecteur={selecteur}
      />
    </div>
  );
}

/**
 * Hauteur réelle de l'en-tête collant (variable avec le sélecteur d'entreprise, le retour à la
 * ligne…) publiée dans `--entete-pro` : les éléments collants des pages se placent juste dessous.
 */
function useEntete() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const racine = document.documentElement.style;
    const publier = () => racine.setProperty('--entete-pro', `${el.offsetHeight}px`);
    publier();
    const obs = new ResizeObserver(publier);
    obs.observe(el);
    return () => {
      obs.disconnect();
      racine.removeProperty('--entete-pro');
    };
  }, []);
  return ref;
}
