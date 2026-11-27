'use client';

import { useState, type DragEvent } from 'react';

/**
 * Glisser-déposer d'un fichier sur une zone (logo, bannière) : `survol` pour le retour visuel,
 * `zone` à étaler sur l'élément. Le clic sur la zone reste l'alternative accessible.
 */
export function useGlisserDeposer(deposer: (f: File | undefined) => void, actif = true) {
  const [survol, setSurvol] = useState(false);
  const arreter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const zone = actif
    ? {
        onDragOver: (e: DragEvent) => {
          arreter(e);
          setSurvol(true);
        },
        onDragLeave: (e: DragEvent) => {
          arreter(e);
          setSurvol(false);
        },
        onDrop: (e: DragEvent) => {
          arreter(e);
          setSurvol(false);
          deposer(e.dataTransfer.files[0]);
        },
      }
    : {};
  return { survol, zone };
}
