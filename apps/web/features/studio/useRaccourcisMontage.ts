'use client';

import { useEffect } from 'react';
import type { Lecture } from './useLectureMontage';

/**
 * Raccourcis de l'éditeur (hors champs de saisie) : Espace lit ou met en pause, S scinde,
 * Suppr efface la sélection, ← → avancent la tête de 0,1 s (1 s avec Maj).
 */
export function useRaccourcisMontage(a: {
  lecture: Lecture;
  onScinder: () => void;
  onSupprimer: (() => void) | undefined;
}) {
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        cible.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      const l = a.lecture;
      if (e.key === ' ' && !cible.closest('button,summary,[role="button"],[role="slider"]')) {
        e.preventDefault();
        if (l.affiche >= l.duree) {
          l.aller(0);
          l.setLecture(true);
        } else l.setLecture(!l.lecture);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        a.onScinder();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && a.onSupprimer) {
        e.preventDefault();
        a.onSupprimer();
      } else if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        !cible.closest('[role="slider"]')
      ) {
        e.preventDefault();
        const pas = e.shiftKey ? 1_000 : 100;
        l.aller(l.affiche + (e.key === 'ArrowLeft' ? -pas : pas));
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  });
}
