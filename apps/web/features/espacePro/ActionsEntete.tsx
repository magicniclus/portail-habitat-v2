'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Emplacement des actions propres à une page, dans la barre du haut de l'espace pro. */
export const ID_ACTIONS_ENTETE = 'actions-entete';

const sansAbonnement = () => () => {};

/** Place `children` dans la barre du haut (« Voir ma fiche publique » sur Ma fiche, maquette). */
export function ActionsEntete({ children }: { children: ReactNode }) {
  // L'emplacement existe dès le rendu du cadre ; rien côté serveur (portail après hydratation).
  const cible = useSyncExternalStore(
    sansAbonnement,
    () => document.getElementById(ID_ACTIONS_ENTETE),
    () => null,
  );
  return cible ? createPortal(children, cible) : null;
}
