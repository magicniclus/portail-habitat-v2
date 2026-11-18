import type { Niveau } from '@ph/core/dessin';
import { memo, type ComponentType } from 'react';
import type { EtatEditeur } from './etat';

/**
 * Calque du plan qui ne se redessine que si ses données changent (DES-48, 500 murs et 1 000
 * objets) : les champs listés du niveau et de l'état, et ses autres propriétés (comparées par
 * identité ; les rappels doivent donc être stables).
 */
export function memoCalque<P extends { niveau: Niveau; etat: EtatEditeur }>(
  Calque: ComponentType<P>,
  champsNiveau: readonly (keyof Niveau)[],
  champsEtat: readonly (keyof EtatEditeur)[],
) {
  return memo(Calque, (avant, apres) => {
    for (const k of Object.keys(apres) as (keyof P)[])
      if (k !== 'niveau' && k !== 'etat' && avant[k] !== apres[k]) return false;
    return (
      champsNiveau.every((c) => avant.niveau[c] === apres.niveau[c]) &&
      champsEtat.every((c) => avant.etat[c] === apres.etat[c])
    );
  });
}
