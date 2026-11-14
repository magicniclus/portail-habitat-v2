'use client';

import { ListIcon } from '@phosphor-icons/react/ssr';
import { useRef, useState, type ReactNode } from 'react';
import { IconButton } from '../primitives/IconButton';
import { PanneauPleinEcran } from './PanneauPleinEcran';

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
 * panneau plein écran (`PanneauPleinEcran`). Le site charge le panneau à la demande (budget D46).
 */
export function MenuPleinEcran({ titre, entete, children, className }: MenuPleinEcranProps) {
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const fermer = () => setOuvert(false);
  return (
    <>
      <IconButton
        ref={bouton}
        aria-label={titre}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        icone={<ListIcon weight="bold" />}
        className={className}
        onClick={() => setOuvert(true)}
      />
      <PanneauPleinEcran
        titre={titre}
        entete={entete}
        ouvert={ouvert}
        onOuvertChange={setOuvert}
        retourFocus={bouton}
      >
        {children(fermer)}
      </PanneauPleinEcran>
    </>
  );
}
