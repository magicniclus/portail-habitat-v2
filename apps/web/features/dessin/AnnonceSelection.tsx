'use client';

import { descriptionSelection } from '@ph/core/dessin';
import { niveauDe, type EtatEditeur } from './etat';

/** Élément choisi et ses mesures, lus par les lecteurs d'écran (DES-47) ; invisible à l'écran. */
export function AnnonceSelection({ etat }: { etat: EtatEditeur }) {
  return (
    <p className="sr-only" aria-live="polite" data-testid="annonce-selection">
      {descriptionSelection(niveauDe(etat), etat.selection)}
    </p>
  );
}
