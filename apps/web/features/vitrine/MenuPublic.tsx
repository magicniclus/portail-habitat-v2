'use client';

import { IconButton } from '@ph/ui';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import type { LienNav } from './EnTetePublic';

const PanneauMenu = dynamic(() => import('./PanneauMenu'), { ssr: false });

/** Icône « menu » en trait (évite une bibliothèque d'icônes dans le JavaScript initial). */
function IconeMenu() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/**
 * Menu plein écran sous 1024 px (MOBILE §6, ACC-04) : le bouton (avec `aria-expanded`) est léger,
 * le panneau n'est chargé qu'à la première ouverture (budget JavaScript D46).
 */
export function MenuPublic({
  liens,
  principal,
  variantLogo,
}: {
  liens: LienNav[];
  principal: LienNav;
  variantLogo: 'particulier' | 'pro' | 'diag';
}) {
  const [ouvert, setOuvert] = useState(false);
  const [charge, setCharge] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <IconButton
        ref={bouton}
        aria-label="Menu principal"
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        icone={<IconeMenu />}
        className="lg:hidden"
        onClick={() => {
          setCharge(true);
          setOuvert(true);
        }}
      />
      {charge ? (
        <PanneauMenu
          liens={liens}
          principal={principal}
          variantLogo={variantLogo}
          ouvert={ouvert}
          onOuvertChange={setOuvert}
          retourFocus={bouton}
        />
      ) : null}
    </>
  );
}
